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
  answers: { answer: string; context: string }[];
  globalContext: string;
  model?: AIModel;
  prompt?: string;
  screenshot?: string;
}

export interface ValidationResponse {
  results: {
    isCorrect: boolean;
    feedback: string;
  }[];
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

export interface GenerateFormResponse {
  app: string;
  context: string;
  thumbnail?: string;
}

export const FormGeneratorDefaults = {
  model: AIModel.CLAUDE35_SONNET,
  systemPrompt: `
You are an expert frontend developer and write amazing interactive React applications.
You follow user instructions exactly. 
You output _only_ JS. Your JS output must be parseable directly!
`.trim(),

  userPrompt: `
Create a React app which mimics this textbook page.

It should exactly imitate the design and layout of the page. It should have all
of the same content as the page. The only changes you should make is to replace
places where the reader is expected to write answer with an appropriate
text/select/textarea input.

You are allowed to use the following libraries:

* mantine v7
* react
* react-dom

You should export a single component with your app. You can use as many child 
components as needed to complete the task. You should try to do a good job and
write clean code.

You have access to the following smart validation function:

interface ValidationRequest = {
  globalContext: string,
  answers: [{
    answer: string;
    context: string;
  }],
}

interface ValidationResponse = {
  results: [{
    isCorrect: boolean;
    feedback: string;
  }],
}

checkUserAnswers(request: ValidationRequest): ValidationResponse

You must:

* Provide a way to validate if a user's answers are correct.
* Provide a "submit" button or similar which will trigger validation.
* Provide a loading spinner while the validation is in progress.
* Provide enough information in "context" to allow the checkAnswers to
  correctly understand the question and the users answer. checkAnswers
  has _no other information other than what you provide in the context_,
  so your context must be complete. e.g. if the question is asking the 
  user to choose between 5 different grammar options, you should indicate
  the available options, the question, any context about the question etc.

You should:

* Show feedback after validation is complete.
* Show each piece of feedback next to the corresponding input.

`.trim(),
};

export const ValidationDefaults = {
  model: AIModel.CLAUDE35_SONNET,
  userPrompt: `
Please examine the inputs provided and determine if they are correct.
Provide detailed feedback explaining why or why not for each input.

Return a JSON object with the following structure:

interface ValidationResponse = {
  results: [{
    isCorrect: boolean;
    feedback: string;
  }],
}
`.trim(),
  systemPrompt: `
You are an expert teacher. You understand all world languages, programming
languages etc and are generally recognized for your ability to provide
excellent corrective feedback when students make mistakes.

You have been given a set of answers and contexts. You should examine each
answer and determine if it is correct. You should provide detailed feedback
explaining why or why not for each answer.
  `.trim(),
};
