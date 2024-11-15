import { AIModel, GenerationMode } from "./common";
import { LLMConfig, LLMQuery } from "./llm";

import { createLogger } from "./logging";
const logger = createLogger("generate");

export interface GenerateFormRequest {
  imageData: {
    base64: string;
    mimeType: string;
  };
  modelConfig: LLMConfig;
  generationMode: GenerationMode;
}

export interface GenerateFormResponse {
  app: string;
  context: string;
  thumbnail?: string;
}

export interface CheckAnswerRequest {
  answers: { answer: string; context: string }[];
  globalContext: string;
  screenshot?: string;
  modelConfig: LLMConfig;
}

export interface CheckAnswerResponse {
  results: {
    isCorrect: boolean;
    feedback: string;
  }[];
}

export const FormGeneratorDefaults = {
  model: AIModel.CLAUDE35_SONNET,
  basePrompt: `
You are allowed to use the following libraries:

* mantine v7
* react
* react-dom

You should export a single component with your app. You can use as many child 
components as needed to complete the task. You should try to do a good job and
write clean code.

You have access to the following function which will validate the user's answers
by sending them off to an expert. The expert does not have any information about
the user's answers other than what you provide in the context.

interface CheckAnswerRequest = {
  globalContext: string,
  answers: [{
    answer: string;
    context: string;
  }],
}

interface CheckAnswerResponse = {
  results: [{
    isCorrect: boolean;
    feedback: string;
  }],
}

checkUserAnswers(request: CheckAnswerRequest): Promise<CheckAnswerResponse>

You must:

* Provide a "submit" button or similar to validate the user's answers.
* Provide a loading spinner while the validation is in progress.
* Include the entire page (or similar level of detail) in the "globalContext" field with appropriate information about the type of content.
* Include enough local context for each answer to allow the checkUserAnswers to correctly understand the question and the users answer.
* Show feedback after validation is complete.
* Show positive feedback for correct answers, e.g. a green checkmark.
* Show each feedback next to the corresponding input.
* Write good code: don't duplicate content and factor logic appropriately.
`.trim(),

  replicatePrefix: `
Create a React app which mimics this textbook page.

It should exactly imitate the design and layout of the page. It should have all
of the same content as the page. The only changes you should make is to replace
places where the reader is expected to write answers with appropriate
text/select/textarea inputs.
`.trim(),

  generatePrefix: `
Create a new React app with exercises similar in style and theme to this textbook page.

Generate new exercises that test similar concepts but with different content.
The exercises should maintain the same difficulty level and teaching approach.
`.trim(),

  systemPrompt: `
You are an expert frontend developer and write amazing interactive React applications.
You follow user instructions exactly. 
You output _only_ JS. Your JS output must be parseable directly!
`.trim(),
};

export const CheckAnswerDefaults = {
  model: AIModel.GEMINI_FLASH_LATEST,
  userPrompt: `
Please examine the inputs provided and determine if they are correct.
Provide detailed feedback explaining why or why not for each input.

Return a JSON object with the following structure:

interface CheckAnswerResponse = {
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

// Look for guards like ```javascript or ```jsx. Extract the contents from the guards
// and return the contents as a string
export function extractGuardedCode(response: any) {
  const guardRegex = /```(?:javascript|jsx)\n([\s\S]+?)\n```/i;
  const match = response.match(guardRegex);
  if (!match) {
    return {
      app: response,
      context: "",
    };
  }
  const context = response.replace(guardRegex, "");
  const code = match[1];
  return {
    app: code,
    context,
  };
}

export async function generateFormFromImage({
  modelConfig,
  imageData,
  generationMode: mode,
}: GenerateFormRequest): Promise<GenerateFormResponse> {
  const query = new LLMQuery(modelConfig)
    .system(FormGeneratorDefaults.systemPrompt)
    .user(
      mode === GenerationMode.REPLICATE
        ? `${FormGeneratorDefaults.replicatePrefix}\n\n${FormGeneratorDefaults.basePrompt}`
        : `${FormGeneratorDefaults.generatePrefix}\n\n${FormGeneratorDefaults.basePrompt}`
    )
    .image(imageData);

  let response = await query.execute();
  return extractGuardedCode(response);
}

export async function validateUserResponse(
  request: CheckAnswerRequest
): Promise<CheckAnswerResponse> {
  let { answers, globalContext, modelConfig: model } = request;

  if (!model) {
    model = { model: CheckAnswerDefaults.model, apiKeys: {} };
  }

  const schema = {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            isCorrect: { type: "boolean" },
            feedback: { type: "string" },
          },
        },
      },
    },
  };

  const query = new LLMQuery(model as LLMConfig)
    .outputJson(schema)
    .system(CheckAnswerDefaults.systemPrompt)
    .user(CheckAnswerDefaults.userPrompt)
    .user(
      `
Global context is ${globalContext}
User answers and their contexts are:
${answers
  .map(
    ({ answer, context }, index) =>
      `Answer ${index + 1}: ${answer}, Context: ${context}`
  )
  .join("\n")}
`
    )
    .outputJson();

  const response = await query.execute();
  logger.debug("Response", response);
  return response as CheckAnswerResponse;
}
