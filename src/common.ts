// Common types, constants, requests and responses shared between the frontend and backend

import { CheckAnswerRequest, CheckAnswerResponse } from "./generate";
import { type LLMConfig } from "./llm";

export enum GenerationMode {
  REPLICATE = "replicate",
  GENERATE = "generate"
}

export enum AIModel {
  GPT4_TURBO = "gpt-4-turbo",
  GPT4O_MINI = "gpt-4o-mini",
  GPT4O = "gpt-4o",
  GPT35_TURBO = "gpt-3.5-turbo",
  GEMINI_PRO = "gemini-pro",
  GEMINI_PRO_VISION = "gemini-pro-vision",
  GEMINI_FLASH_001 = "gemini-1.5-flash-001",
  GEMINI_FLASH_002 = "gemini-1.5-flash-002",
  GEMINI_FLASH_LATEST = "gemini-1.5-flash-latest",
  GEMINI_FLASH_8B = "gemini-1.5-flash-8b",
  CLAUDE3_HAIKU = "claude-3-haiku-20240307",
  CLAUDE35_SONNET = "claude-3-5-sonnet-20241022",
}

// The request to generate a form from an image, contains an image and the model config
export interface GenerateFormWebRequest extends FormData {
  image: File;
  modelConfig: LLMConfig;
  mode: GenerationMode;
}

export interface GenerateFormWebResponse {
  app: string;
  context: string;
  thumbnail: string;
}

// check answer web request has an optional model config
export interface CheckAnswerWebRequest extends Omit<CheckAnswerRequest, "modelConfig"> {
  modelConfig?: LLMConfig;
}
export type CheckAnswerWebResponse = CheckAnswerResponse;
