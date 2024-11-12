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

export const DEFAULT_SYSTEM_PROMPT = `
You are an expert at HTML page and form design.

You generate HTML pages and forms which exactly imitate an input image from a
textbook and recreate it in a "live" feeling environment. You output _only_ HTML
output, without any additional content. You are allowed and encouraged to use
HTML comments to describe your thinking.
`.trim();

export const DEFAULT_USER_PROMPT = `
Generate an HTML form based on the provided image.
`.trim();

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
