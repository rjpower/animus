import type { AIModel } from "./common";
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

// Utility function for exponential backoff with jitter
async function exponentialBackoff(
  attempt: number,
  maxAttempts: number,
): Promise<boolean> {
  if (attempt >= maxAttempts) {
    return false;
  }
  const baseDelay = 1000;
  const maxDelay = 64 * 1000;
  const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
  const jitter = delay * 0.1 * Math.random(); // 10% jitter
  await new Promise((resolve) => setTimeout(resolve, delay + jitter));
  return true;
}

async function handleApiError(
  response: Response,
  context = "",
): Promise<never> {
  const error = await response.text();
  const contextStr = context ? ` for ${context}` : "";
  const errorMessage = `API error${contextStr.slice(0, 1000)} (${response.status}): ${error.slice(0, 1000)}`;
  class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
      this.name = "ApiError";
    }
  }

  const err = new ApiError(errorMessage, response.status);
  throw err;
}

export type MessageType = "system" | "user" | "assistant";

export interface Message {
  role: MessageType;
  text: string | null;
  image: { base64: string; mimeType: string } | null;
}

export class OpenAIClient {
  constructor(
    private model: string,
    private baseUrl = "https://api.openai.com/v1/chat/completions",
  ) {}

  private formatMessages(messages: Message[]) {
    return messages.map((msg) => {
      if (msg.role === "system") {
        return {
          role: "system",
          content: msg.text,
        };
      }

      // Handle user messages with potential images
      if (msg.role === "user") {
        if (msg.image) {
          return {
            role: "user",
            content: [
              ...(msg.text ? [{ type: "text", text: msg.text }] : []),
              {
                type: "image_url",
                image_url: {
                  url: `data:${msg.image.mimeType};base64,${msg.image.base64}`,
                },
              },
            ],
          };
        }

        return {
          role: "user",
          content: msg.text,
        };
      }

      // Handle assistant messages
      return {
        role: "assistant",
        content: msg.text,
      };
    });
  }

  async complete(messages: Message[], jsonMode = false, jsonSchema?: object) {
    const body: any = {
      model: this.model,
      messages: this.formatMessages(messages),
      temperature: 0,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
      if (jsonSchema) {
        const systemIdx = messages.findIndex((m) => m.role === "system");
        if (systemIdx >= 0) {
          const systemMsg = messages[systemIdx];
          messages[systemIdx] = {
            ...systemMsg,
            text: `${systemMsg.text}\nRespond using this JSON schema:\n${JSON.stringify(jsonSchema, null, 2)}`,
          };
        }
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleApiError(response, "OpenAI API");
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    // Log usage metadata
    if (result.usage) {
      logger.info("OpenAI API usage", {
        model: this.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      });
    }

    if (jsonMode) {
      return JSON.parse(content);
    }

    return content;
  }
}

export class GeminiClient {
  constructor(
    private model: string,
    private baseUrl = "https://generativelanguage.googleapis.com",
  ) {}

  private formatMessages(messages: Message[]) {
    const systemMessages = messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = messages.filter((msg) => msg.role !== "system");

    const systemInstruction = {
      system_instruction: {
        parts: [
          {
            text: systemMessages.map((msg) => msg.text).join("\n"),
          },
        ],
      },
    };

    // Format regular messages
    const contents = nonSystemMessages.map((msg) => {
      const parts: Array<{
        inline_data?: { mime_type: string; data: string };
        text?: string;
      }> = [];
      if (msg.image) {
        parts.push({
          inline_data: {
            mime_type: msg.image.mimeType,
            data: msg.image.base64,
          },
        });
      }
      if (msg.text) {
        parts.push({ text: msg.text });
      }
      return { role: msg.role, parts };
    });

    // add a text message if there are no user _text_ messages
    if (
      contents.length === 0 ||
      !contents.some((c) => c.role === "user" && c.parts.some((p) => p.text))
    ) {
      contents.push({
        role: "user",
        parts: [{ text: "Please analyze my images." }],
      });
    }

    return {
      ...systemInstruction,
      contents: contents.length === 1 ? contents[0] : contents,
    };
  }

  async complete(messages: Message[], jsonMode = false, jsonSchema?: object) {
    const version = "v1beta";
    const endpoint = `${this.baseUrl}/${version}/models/${this.model}:generateContent`;
    const requestBody: any = this.formatMessages(messages);
    if (jsonMode) {
      requestBody.generationConfig = {
        response_mime_type: "application/json",
      };
      if (jsonSchema) {
        const schemaPrompt = `\nRespond using this JSON schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
        requestBody.system_instruction.parts[0].text += schemaPrompt;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await handleApiError(response, "Gemini");
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error(
        `No content in Gemini response: ${JSON.stringify(result)}`,
      );
    }

    // Log usage metadata
    if (result.usageMetadata) {
      logger.info("Gemini API usage", {
        model: this.model,
        promptTokens: result.usageMetadata.promptTokenCount,
        totalTokens: result.usageMetadata.totalTokenCount,
      });
    }

    if (jsonMode) {
      try {
        return JSON.parse(content);
      } catch (e) {
        throw new Error(`Failed to parse JSON response: ${content}`);
      }
    }

    return content;
  }
}

export class AnthropicClient {
  constructor(
    private model: string,
    private baseUrl = "https://api.anthropic.com/v1/messages",
  ) {}

  private formatMessages(
    messages: Message[],
    jsonMode: boolean,
    jsonSchema: object | undefined,
  ): {
    formattedMessages: Array<{ role: string; content: Array<any> }>;
    systemPrompt: string;
  } {
    const userMessages: Message[] = messages.filter(
      (msg) => msg.role === "user",
    );

    const formattedMessages = userMessages.map((msg: Message) => {
      const content: Array<{
        type: string;
        text?: string;
        source?: { type: string; media_type: string; data: string };
      }> = [];

      if (msg.text) {
        content.push({
          type: "text",
          text: msg.text,
        });
      }
      if (msg.image) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: msg.image.mimeType,
            data: msg.image.base64,
          },
        });
      }
      return {
        role: "user",
        content,
      };
    });

    const systemMessages: string[] = messages
      .filter((msg) => msg.role === "system" && msg.text !== null)
      .map((msg) => msg.text as string);

    let systemPrompt = systemMessages.join("\n");

    if (jsonMode) {
      systemPrompt += "\nRespond using ONLY JSON.";
    }

    return {
      formattedMessages,
      systemPrompt,
    };
  }

  async complete(
    messages: Message[],
    jsonMode = false,
    jsonSchema?: object,
  ): Promise<any> {
    const { formattedMessages, systemPrompt } = this.formatMessages(
      messages,
      jsonMode,
      jsonSchema,
    );

    const body: any = {
      model: this.model,
      messages: formattedMessages,
      max_tokens: 4096,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY as string;
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleApiError(response, "Anthropic API");
    }

    const result = await response.json();

    // Extract text from the content array
    const content = result.content?.[0]?.text;
    if (!content) {
      throw new Error(
        `No content in Anthropic response: ${JSON.stringify(result)}`,
      );
    }

    if (result.usage) {
      logger.info("Anthropic API usage", {
        model: this.model,
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens,
      });
    }

    if (jsonMode) {
      try {
        return JSON.parse(content);
      } catch (e) {
        throw new Error(`Failed to parse JSON response: ${content}`);
      }
    }

    return content;
  }
}

export class LLMQuery {
  private messages: Message[] = [];
  private jsonMode = false;
  private jsonSchema?: object;
  private client: OpenAIClient | GeminiClient | AnthropicClient;

  constructor(model: AIModel) {
    if (model.startsWith("gpt-")) {
      this.client = new OpenAIClient(model);
    } else if (model.startsWith("gemini-")) {
      this.client = new GeminiClient(model);
    } else if (model.startsWith("claude-")) {
      this.client = new AnthropicClient(model);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  system(prompt: string): LLMQuery {
    this.messages.push({
      role: "system",
      text: prompt,
      image: null,
    });
    return this;
  }

  user(prompt: string): LLMQuery {
    this.messages.push({
      role: "user",
      text: prompt,
      image: null,
    });
    return this;
  }

  image({ mimeType, base64 }: { mimeType: string; base64: string }): LLMQuery {
    this.messages.push({
      role: "user",
      text: null,
      image: { mimeType, base64 },
    });
    return this;
  }

  outputJson(schema?: object): LLMQuery {
    this.jsonMode = true;
    this.jsonSchema = schema;
    return this;
  }

  async execute(maxAttempts = 5): Promise<any> {
    let attempt = 0;
    let lastError: Error | null = null;
    while (true) {
      try {
        return await this.client.complete(
          this.messages,
          this.jsonMode,
          this.jsonSchema,
        );
      } catch (error: unknown) {
        if (!(error instanceof Error)) {
          throw error;
        }

        if ((error as any).status === 503) {
          attempt++;
          lastError = error;
          logger.warn(
            `Received 503 error, attempt ${attempt} of ${maxAttempts}`,
          );
          const shouldContinue = await exponentialBackoff(attempt, maxAttempts);
          if (shouldContinue) {
            continue;
          }
          throw new Error(
            `Maximum retry attempts (${maxAttempts}) exceeded: ${error.message}`,
            { cause: lastError },
          );
        }
        throw error;
      }
    }
  }
}
