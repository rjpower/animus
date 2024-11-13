import type { AIModel, GenerateFormRequest, ValidationRequest } from "./common";
import { LLMQuery } from "./llm";

export async function generateFormFromImage({
  imageData,
  model,
  systemPrompt,
  userPrompt,
}: GenerateFormRequest): Promise<string> {
  const query = new LLMQuery(model as AIModel)
    .system(systemPrompt)
    .user(userPrompt)
    .image(imageData);

  let response = await query.execute();
  if (response.startsWith("```html")) {
    // strip ```html guard from response if present
    response = response.replace("```html", "");
    response = response.replace("```", "");
  }

  return response as string;
}

export async function validateUserResponse({
  model,
  screenshot,
}: ValidationRequest): Promise<{ isCorrect: boolean; feedback: string }> {
  const schema = {
    type: "object",
    properties: {
      isCorrect: { type: "boolean" },
      feedback: { type: "string" },
    },
    required: ["isCorrect", "feedback"],
  };

  const query = new LLMQuery(model as AIModel)
    .system(
      "You are a validation assistant. Examine the screenshot showing user input highlighted in green and provide detailed feedback.",
    )
    .user(
      `
Examine the green highlighted input in the screenshot and the surrounding context.
Was the user input correct? 
Provide detailed feedback explaining why or why not.

Return a JSON object with feedback (string) and isCorrect (boolean) fields.
`.trim(),
    )
    .image({
      base64: screenshot,
      mimeType: "image/png",
    })
    .outputJson(schema);

  const response = await query.execute();
  console.log("Response", response);
  return response as { isCorrect: boolean; feedback: string };
}
