import {
  AIModel,
  GenerateFormRequest,
  GenerateFormResponse,
  ValidationDefaults,
  ValidationRequest,
  ValidationResponse,
} from "./common";
import { LLMQuery } from "./llm";

import { createLogger } from "./logging";
const logger = createLogger("generate");

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
  imageData,
  model,
  systemPrompt,
  userPrompt,
}: GenerateFormRequest): Promise<GenerateFormResponse> {
  const query = new LLMQuery(model as AIModel)
    .system(systemPrompt)
    .user(userPrompt)
    .image(imageData);

  let response = await query.execute();
  return extractGuardedCode(response);
}

export async function validateUserResponse(
  request: ValidationRequest
): Promise<ValidationResponse> {
  const {
    answers,
    globalContext,
    model = ValidationDefaults.model,
    prompt = ValidationDefaults.userPrompt,
    screenshot = "",
  } = request;

  const query = new LLMQuery(model as AIModel)
    .system(ValidationDefaults.systemPrompt)
    .user(prompt)
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
  return response as ValidationResponse;
}
