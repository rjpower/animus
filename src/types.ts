// Common types, constants, requests and responses shared between the frontend and backend

import { CheckAnswerRequest, CheckAnswerResponse } from "./generate";

export interface AIModelInfo {
  name: string;
  provider: "openai" | "gemini" | "anthropic";
  modelId: string;
}

export const AI_MODELS: Record<string, AIModelInfo> = {
  "gpt-4-turbo": {
    name: "GPT-4 Turbo",
    modelId: "gpt-4-turbo",
    provider: "openai",
  },
  "gpt-4o-mini": {
    name: "GPT-4 Mini",
    modelId: "gpt-4o-mini",
    provider: "openai",
  },
  "gpt-4o": { name: "GPT-4", modelId: "gpt-4o", provider: "openai" },
  "gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    modelId: "gpt-3.5-turbo",
    provider: "openai",
  },
  "gemini-pro": {
    name: "Gemini Pro",
    modelId: "gemini-pro",
    provider: "gemini",
  },
  "gemini-pro-vision": {
    name: "Gemini Pro Vision",
    modelId: "gemini-pro-vision",
    provider: "gemini",
  },
  "gemini-1.5-flash-001": {
    name: "Gemini Flash 001",
    modelId: "gemini-1.5-flash-001",
    provider: "gemini",
  },
  "gemini-1.5-flash-002": {
    name: "Gemini Flash 002",
    modelId: "gemini-1.5-flash-002",
    provider: "gemini",
  },
  "gemini-1.5-flash-8b": {
    name: "Gemini Flash 8B",
    modelId: "gemini-1.5-flash-8b",
    provider: "gemini",
  },
  "claude-3-haiku-20240307": {
    name: "Claude 3 Haiku",
    modelId: "claude-3-haiku-20240307",
    provider: "anthropic",
  },
  "claude-3-5-sonnet-20241022": {
    name: "Claude 3.5 Sonnet",
    modelId: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
  },
};

export enum GenerationMode {
  REPLICATE = "replicate",
  GENERATE = "generate",
}

export interface ApiKeys {
  openai?: string;
  gemini?: string;
  anthropic?: string;
}

export class ClientConfig {
  public generationModel: keyof typeof AI_MODELS = "claude-3-5-sonnet-20241022";
  public validationModel: keyof typeof AI_MODELS = "gemini-1.5-flash-002";
  public apiKeys: ApiKeys = {};
}

// The request to generate a form from an image, contains an image and the model config
export interface GenerateFormWebRequest extends FormData {
  image?: File;
  prompt?: string;
  mode: GenerationMode;
  clientConfig: ClientConfig;
}

export interface GenerateFormWebResponse {
  app: string;
  context: string;
}

export interface CheckAnswerWebRequest
  extends Omit<CheckAnswerRequest, "modelConfig"> {
  clientConfig: ClientConfig;
}
export type CheckAnswerWebResponse = CheckAnswerResponse;
