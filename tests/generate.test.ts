import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, DOMWindow } from "jsdom";
import { generateFormFromImage, validateUserResponse } from "../src/generate";
import {
	AIModel,
	DEFAULT_SYSTEM_PROMPT,
	DEFAULT_USER_PROMPT,
} from "../src/common";

describe("Book Functions", () => {
	const pageScreenshot = fs
		.readFileSync(path.join(__dirname, "fixtures/tobira-0.jpg"))
		.toString("base64");

	const validateScreenshot = fs
		.readFileSync(path.join(__dirname, "fixtures/validate-0.png"))
		.toString("base64");

	describe("generateFormFromImage", () => {
		it("should generate valid HTML form from image", async () => {
			const result = await generateFormFromImage({
				imageData: { base64: pageScreenshot, mimeType: "image/jpeg" },
				model: AIModel.GEMINI_FLASH_8B,
				systemPrompt: DEFAULT_SYSTEM_PROMPT,
				userPrompt: DEFAULT_USER_PROMPT,
			});

			// Verify the HTML structure
			expect(result).toContain("form");

			// Parse HTML to verify it's valid
			const { window } = new JSDOM(result, {
				url: "http://localhost",
				contentType: "text/html",
				pretendToBeVisual: false,
			});
			const doc = window.document;
			expect(doc.querySelector("form")).toBeTruthy();
		}, 30000);
	});

	describe("validateUserResponse", () => {
		it("should validate user responses correctly", async () => {
			const result = await validateUserResponse({
				model: AIModel.GEMINI_FLASH_8B,
				screenshot: validateScreenshot,
			});

			expect(result).toHaveProperty("isCorrect");
			expect(result).toHaveProperty("feedback");
			expect(typeof result.isCorrect).toBe("boolean");
			expect(typeof result.feedback).toBe("string");
		}, 10000);
	});
});
