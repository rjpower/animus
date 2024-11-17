// Mediocre LLM abstraction for OpenAI, Gemini, and Anthropic APIs

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createLogger } from "./logging";
import { AI_MODELS } from "./types";

const logger = createLogger("llm");

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

export interface LLMConfig {
  model: keyof typeof AI_MODELS;
  apiKey: string;
}

interface BackendConfig {
  model: string;
  baseUrl: string;
  headers: Record<string, string>;
}

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

function logUsage(usageData: any, model: string): void {
  if (!usageData) return;
  logger.info(`API usage`, {
    model,
    ...usageData,
  });
}

type CacheEntry = {
  timestamp: string;
  request: {
    messages: Message[];
    jsonMode: boolean;
    jsonSchema?: object;
    model: string;
  };
  response: any;
};

const dataDir = process.env["DATA_DIR"] || "./data";

export class LLMCache {
  private readonly cacheDir: string;

  constructor(baseDir: string = `${dataDir}/llm`) {
    this.cacheDir = path.resolve(baseDir);
    logger.info("Using cache directory: ", this.cacheDir);
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  private generateHash(data: unknown): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  async get(
    model: string,
    messages: Message[],
    jsonMode: boolean,
    jsonSchema?: object
  ): Promise<any | null> {
    const hash = this.generateHash({ model, messages, jsonMode, jsonSchema });
    const cachePath = path.join(this.cacheDir, `${hash}.json`);

    if (!fs.existsSync(cachePath)) return null;
    const cacheEntry: CacheEntry = JSON.parse(
      await fs.promises.readFile(cachePath, "utf-8")
    );
    return cacheEntry.response;
  }

  async set(
    model: string,
    messages: Message[],
    jsonMode: boolean,
    jsonSchema: object | undefined,
    response: any
  ): Promise<void> {
    const hash = this.generateHash({ model, messages, jsonMode, jsonSchema });

    const cacheEntry: CacheEntry = {
      timestamp: new Date().toISOString(),
      request: { model, messages, jsonMode, jsonSchema },
      response,
    };

    await fs.promises.writeFile(
      path.join(this.cacheDir, `${hash}.json`),
      JSON.stringify(cacheEntry, null, 2)
    );
  }
}

abstract class BaseLLMClient {
  protected constructor(protected readonly config: BackendConfig) {}

  protected abstract formatMessages(
    messages: Message[],
    jsonMode: boolean,
    jsonSchema?: object
  ): any;

  protected abstract extractContent(response: any): string;

  async makeApiRequest(body: any): Promise<Response> {
    return fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        ...this.config.headers,
      },
      body: JSON.stringify(body),
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

    logUsage(result.usage || result.usageMetadata, this.config.model);

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
  constructor(config: LLMConfig) {
    super({
      model: config.model,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
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
      model: this.config.model,
      messages: formattedMessages,
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
  constructor(config: LLMConfig) {
    super({
      model: config.model,
      baseUrl: `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
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
        ? { response_mime_type: "application/json" }
        : undefined,
    };

    return body;
  }

  protected extractContent(response: any): string {
    return response.candidates?.[0]?.content?.parts?.[0]?.text;
  }
}

export class AnthropicClient extends BaseLLMClient {
  constructor(config: LLMConfig) {
    super({
      model: config.model,
      baseUrl: "https://api.anthropic.com/v1/messages",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": config.apiKey,
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
      model: this.config.model,
      messages: formattedMessages,
      max_tokens: 4096,
      ...(systemPrompt && { system: systemPrompt }),
    };
  }

  protected extractContent(response: any): string {
    return response.content?.[0]?.text;
  }
}

const cache = new LLMCache();

export class LLMQuery {
  private messages: Message[] = [];
  private jsonMode = false;
  private jsonSchema?: object;
  private client: BaseLLMClient;
  private model: string;

  constructor(config: LLMConfig) {
    this.model = config.model;
    const modelType = AI_MODELS[config.model].provider;

    if (modelType === "openai") {
      this.client = new OpenAIClient(config);
    } else if (modelType === "gemini") {
      this.client = new GeminiClient(config);
    } else if (modelType === "anthropic") {
      this.client = new AnthropicClient(config);
    } else {
      throw new Error(`Unknown model provider for model ${config.model}`);
    }
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
    const cachedResponse = await cache.get(
      this.model,
      this.messages,
      this.jsonMode,
      this.jsonSchema
    );

    if (cachedResponse) {
      logger.info("Using cached response");
      return cachedResponse;
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (true) {
      try {
        const response = await this.client.complete(
          this.messages,
          this.jsonMode,
          this.jsonSchema
        );

        await cache.set(
          this.model,
          this.messages,
          this.jsonMode,
          this.jsonSchema,
          response
        );

        return response;
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
