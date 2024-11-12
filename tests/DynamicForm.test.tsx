/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { DynamicForm, validateResponse } from "../src/DynamicForm";

import {
	beforeAll,
	afterAll,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";

import express from "express";
import http from "http";

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

Object.defineProperty(window, "getComputedStyle", {
	value: () => ({
		getPropertyValue: jest.fn().mockImplementation(() => ""),
	}),
});

class TestServer {
	private server?: http.Server;
	private app = express();
	public requests: Array<object> = [];

	constructor() {
		this.app.use(express.json());
		this.app.post("/api/validate", (req, res) => {
			this.requests.push(req.body);
			res.json({
				isValid: true,
				value: req.body.value,
			});
		});
	}

	start(port = 4000): Promise<void> {
		return new Promise((resolve) => {
			this.server = this.app.listen(port, () => resolve());
		});
	}

	stop(): Promise<void> {
		this.requests = [];
		return new Promise((resolve, reject) => {
			this.server!.close((err: any) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}

const server = new TestServer();

beforeAll(async () => {
	return server.start();
});

afterAll(async () => {
	return server.stop();
});

describe("DynamicForm", () => {
	const mockHtml = `
    <form>
      <input 
        type="text" 
        value="initial"
      />
      <textarea>initial</textarea>
    </form>
  `;

	beforeEach(() => {
		// Clear mock calls between tests
		jest.clearAllMocks();
	});

	it("renders HTML content and handles input changes", () => {
		render(
			<MantineProvider>
				<DynamicForm html={mockHtml} />
			</MantineProvider>,
		);

		// Get all inputs (including textarea)
		const inputs = document.querySelectorAll("input, textarea");

		// Verify inputs were rendered
		expect(inputs.length).toBe(2);

		// Simulate change on text input
		const textInput = inputs[0] as HTMLInputElement;
		fireEvent.change(textInput, { target: { value: "new value" } });

		// verify fetch was called to /api/validate
		expect(server.requests.length).toBe(1);
		jest.clearAllMocks();

		// Simulate change on textarea
		const textArea = inputs[1] as HTMLTextAreaElement;
		fireEvent.change(textArea, { target: { value: "new textarea value" } });

		// Verify validateResponse was called again with correct params
		expect(server.requests.length).toBe(2);
	});

	it("updates content when html prop changes", () => {
		const { rerender } = render(
			<MantineProvider>
				<DynamicForm html={mockHtml} />
			</MantineProvider>,
		);

		// Initial render should have 2 inputs
		expect(document.querySelectorAll("input, textarea").length).toBe(2);

		// Update with new HTML
		const newHtml = '<form><input type="text" data-question-id="q3" /></form>';
		rerender(
			<MantineProvider>
				<DynamicForm html={newHtml} />
			</MantineProvider>,
		);

		// Should now have 1 input
		expect(document.querySelectorAll("input").length).toBe(1);
		expect(
			document.querySelector("input")?.getAttribute("data-question-id"),
		).toBe("q3");
	});
});