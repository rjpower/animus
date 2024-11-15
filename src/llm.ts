import type { AIModel } from "./common";
import { createLogger } from "./logging";

const logger = createLogger("llm");

// Types and Interfaces
export type MessageType = "system" | "user" | "assistant";

interface ImageContent {
  mimeType: string;
  base64: string;
}

export interface Message {
  role: MessageType;
  text: string | null;
  image: ImageContent | null;
}

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  headers: Record<string, string>;
}

// Utility Functions
async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function exponentialBackoff(
  attempt: number,
  maxAttempts: number
): Promise<boolean> {
  if (attempt >= maxAttempts) return false;

  const baseDelay = 1000;
  const maxDelay = 64 * 1000;
  const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
  const jitter = delay * 0.1 * Math.random();
  await sleep(delay + jitter);
  return true;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleApiError(
  response: Response,
  context = ""
): Promise<never> {
  const error = await response.text();
  const contextStr = context ? ` for ${context}` : "";
  const errorMessage = `API error${contextStr.slice(0, 1000)} (${
    response.status
  }): ${error.slice(0, 1000)}`;
  throw new ApiError(errorMessage, response.status);
}

// Base LLM Client
abstract class BaseLLMClient {
  protected constructor(
    protected readonly model: string,
    protected readonly config: ApiConfig
  ) {
    if (!config.apiKey) {
      throw new Error(
        `API key not found for ${this.constructor.name} model: ${model}`
      );
    }
  }

  protected abstract formatMessages(
    messages: Message[],
    jsonMode: boolean,
    jsonSchema?: object
  ): any;

  protected abstract extractContent(response: any): string;

  protected async makeApiRequest(body: any): Promise<Response> {
    return fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        ...this.config.headers,
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  protected logUsage(usageData: any, model: string): void {
    if (!usageData) return;
    logger.info(`${this.constructor.name} API usage`, {
      model,
      ...usageData,
    });
  }

  async complete(
    messages: Message[],
    jsonMode = false,
    jsonSchema?: object
  ): Promise<any> {
    const body = this.formatMessages(messages, jsonMode, jsonSchema);
    const response = await this.makeApiRequest(body);

    if (!response.ok) {
      await handleApiError(response, this.constructor.name);
    }

    const result = await response.json();
    const content = this.extractContent(result);

    if (!content) {
      throw new Error(
        `No content in ${this.constructor.name} response: ${JSON.stringify(
          result
        )}`
      );
    }

    this.logUsage(result.usage || result.usageMetadata, this.model);

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

export class OpenAIClient extends BaseLLMClient {
  constructor(model: string) {
    super(model, {
      baseUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: process.env["OPENAI_API_KEY"]!,
      headers: { "Content-Type": "application/json" },
    });
  }

  protected formatMessages(
    messages: Message[],
    jsonMode: boolean,
    jsonSchema?: object
  ) {
    const formattedMessages = messages.map((msg) => {
      if (msg.role === "system") {
        return { role: "system", content: msg.text };
      }

      if (msg.role === "user" && msg.image) {
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

      return { role: msg.role, content: msg.text };
    });

    const body: any = {
      model: this.model,
      messages: formattedMessages,
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
            text: `${
              systemMsg.text
            }\nRespond using this JSON schema:\n${JSON.stringify(
              jsonSchema,
              null,
              2
            )}`,
          };
        }
      }
    }

    return body;
  }

  protected extractContent(response: any): string {
    return response.choices[0]?.message?.content;
  }
}

export class GeminiClient extends BaseLLMClient {
  constructor(model: string) {
    super(model, {
      baseUrl: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env["GEMINI_API_KEY"]}`,
      apiKey: process.env["GEMINI_API_KEY"]!,
      headers: { "Content-Type": "application/json" },
    });
  }

  protected formatMessages(
    messages: Message[],
    jsonMode: boolean,
    jsonSchema?: object
  ) {
    const systemMessages = messages.filter((msg) => msg.role === "system");
    const userMessages = messages.filter((msg) => msg.role !== "system");

    let systemInstruction = systemMessages.map((msg) => msg.text).join("\n");

    if (jsonMode && jsonSchema) {
      systemInstruction += `\nRespond using this JSON schema:\n${JSON.stringify(
        jsonSchema,
        null,
        2
      )}`;
    }

    const contents = userMessages.map((msg) => ({
      role: msg.role,
      parts: [
        ...(msg.image
          ? [
              {
                inline_data: {
                  mime_type: msg.image.mimeType,
                  data: msg.image.base64,
                },
              },
            ]
          : []),
        ...(msg.text ? [{ text: msg.text }] : []),
      ],
    }));

    let body: any = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: contents.length === 1 ? contents[0] : contents,
      generationConfig: jsonMode
        ? undefined
        : { response_mime_type: "application/json" },
    };

    return body;
  }

  protected extractContent(response: any): string {
    return response.candidates?.[0]?.content?.parts?.[0]?.text;
  }
}

export class AnthropicClient extends BaseLLMClient {
  constructor(model: string) {
    super(model, {
      baseUrl: "https://api.anthropic.com/v1/messages",
      apiKey: process.env["ANTHROPIC_API_KEY"]!,
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": process.env["ANTHROPIC_API_KEY"]!,
      },
    });
  }

  protected formatMessages(
    messages: Message[],
    jsonMode: boolean,
    jsonSchema?: object
  ) {
    const userMessages = messages.filter((msg) => msg.role === "user");
    const systemMessages = messages
      .filter((msg) => msg.role === "system" && msg.text)
      .map((msg) => msg.text as string);

    const formattedMessages = userMessages.map((msg) => ({
      role: "user",
      content: [
        ...(msg.text ? [{ type: "text", text: msg.text }] : []),
        ...(msg.image
          ? [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: msg.image.mimeType,
                  data: msg.image.base64,
                },
              },
            ]
          : []),
      ],
    }));

    let systemPrompt = systemMessages.join("\n");
    if (jsonMode) {
      systemPrompt += "\nRespond using ONLY JSON.";
    }

    return {
      model: this.model,
      messages: formattedMessages,
      max_tokens: 4096,
      ...(systemPrompt && { system: systemPrompt }),
    };
  }

  protected extractContent(response: any): string {
    return response.content?.[0]?.text;
  }
}

export class LLMQuery {
  private messages: Message[] = [];
  private jsonMode = false;
  private jsonSchema?: object;
  private client: BaseLLMClient;

  constructor(model: AIModel) {
    this.client = this.createClient(model);
  }

  private createClient(model: AIModel): BaseLLMClient {
    if (model.startsWith("gpt-")) return new OpenAIClient(model);
    if (model.startsWith("gemini-")) return new GeminiClient(model);
    if (model.startsWith("claude-")) return new AnthropicClient(model);
    throw new Error(`Unsupported model: ${model}`);
  }

  system(prompt: string): this {
    this.messages.push({ role: "system", text: prompt, image: null });
    return this;
  }

  user(prompt: string): this {
    this.messages.push({ role: "user", text: prompt, image: null });
    return this;
  }

  image({ mimeType, base64 }: ImageContent): this {
    this.messages.push({
      role: "user",
      text: null,
      image: { mimeType, base64 },
    });
    return this;
  }

  outputJson(schema?: object): this {
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
          this.jsonSchema
        );
      } catch (error) {
        if (!(error instanceof Error)) throw error;

        if ((error as ApiError).status === 503) {
          attempt++;
          lastError = error;
          logger.warn(
            `Received 503 error, attempt ${attempt} of ${maxAttempts}`
          );

          const shouldContinue = await exponentialBackoff(attempt, maxAttempts);
          if (!shouldContinue) {
            throw new Error(
              `Maximum retry attempts (${maxAttempts}) exceeded: ${error.message}`,
              { cause: lastError }
            );
          }
          continue;
        }
        throw error;
      }
    }
  }
}