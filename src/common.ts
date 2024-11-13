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

export interface ValidationRequest {
  model: AIModel;
  screenshot: string;
}

export interface ValidationResponse {
  isCorrect: boolean;
  feedback: string;
}

export const FormGeneratorDefaults = {
  systemPrompt: `
You are an expert JS developer and write amazing interactive React applications.

You generate a SPA React component and export it.

You exactly imitate an input image from a textbook and recreate it in a "live"
feeling environment. You output _only_ JS. Your JS output must be parseable
directly!

You can use comments to help yourself think or guide the user.
`.trim(),

  userPrompt: `
Create a react app which mimics this textbook page.

The user should be able to input answers and call into an LLM to validate the
response. You can stub in the correct response as a hardcoded answer for the
first version. Use your judgement. 

You are allowed to use the following libraries:

* mantine v7
* react
* react-dom

`.trim(),
};

export interface ImageGenerationRequest {
  image: File;
  model: AIModel;
  systemPrompt: string;
  userPrompt: string;
}

export interface GenerateFormRequest {
  imageData: {
    base64: string;
    mimeType: string;
  };
  model: string;
  systemPrompt: string;
  userPrompt: string;
}
