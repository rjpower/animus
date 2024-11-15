import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, DOMWindow } from "jsdom";
import {
  extractGuardedCode,
  generateFormFromImage,
  validateUserResponse,
} from "../src/generate";
import { AIModel, FormGeneratorDefaults } from "../src/common";

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
        ...FormGeneratorDefaults,
      });

      // Verify the HTML structure
      expect(result).toContain("form");

      // Parse HTML to verify it's valid
      const { window } = new JSDOM(result.app, {
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
        userAnswer: "This is a test",
        context: "The user should answer 'This is a test'",
        screenshot: validateScreenshot,
      });

      expect(result).toHaveProperty("isCorrect");
      expect(result).toHaveProperty("feedback");
      expect(typeof result.isCorrect).toBe("boolean");
      expect(typeof result.feedback).toBe("string");
    }, 10000);
  });

  describe("extractGuardedCode", () => {
    it("should extract code from javascript code block", () => {
      const input = `Some context
\`\`\`javascript
const x = 1;
const y = 2;
\`\`\`
More context`;

      const result = extractGuardedCode(input);
      expect(result.app).toBe("const x = 1;\nconst y = 2;");
      expect(result.context).toBe("Some context\n\nMore context");
    });

    it("should extract code from jsx code block", () => {
      const input = "Context\n```jsx\n<div>Test</div>\n```\n";
      const result = extractGuardedCode(input);
      expect(result.app).toBe("<div>Test</div>");
      expect(result.context).toBe("Context\n\n");
    });

    it("should handle input without code blocks", () => {
      const input = "Just some plain text\nwithout code blocks";
      const result = extractGuardedCode(input);
      expect(result.app).toBe(input);
      expect(result.context).toBe("");
    });

    it("should handle empty input", () => {
      const result = extractGuardedCode("");
      expect(result.app).toBe("");
      expect(result.context).toBe("");
    });
  });
});
