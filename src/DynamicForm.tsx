import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import html2canvas from "html2canvas";
import React from "react";
import { useEffect, useRef } from "react";
import { AIModel } from "./common";
import type { ValidationRequest, ValidationResponse } from "./common";
import * as styles from "./styles.module.css";

export async function validateResponse(
	parent: HTMLElement,
	element: HTMLElement,
) {
	// Clear highlights from all input elements
	const allInputs = parent.querySelectorAll("input, select, textarea");
	for (const input of allInputs) {
		input.classList.remove(styles.validating, styles.correct, styles.incorrect);
	}

	// Add validating class for green highlight. This will be removed after validation
	element.classList.add(styles.validating);

	// Capture screenshot and convert to base64
	const screenshot = await html2canvas(parent);
	const screenshotData = screenshot.toDataURL("image/png").split(",")[1];

	const request: ValidationRequest = {
		model: (localStorage.getItem("selectedModel") as AIModel) || AIModel.GPT4O,
		screenshot: screenshotData,
	};

	try {
		const response = await fetch("/api/validate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		});

		const result = (await response.json()) as ValidationResponse;

		notifications.show({
			title: result.isCorrect ? "Correct!" : "Incorrect",
			message: <div>${result.feedback}</div>,
			color: result.isCorrect ? "green" : "red",
			autoClose: 5000,
		});

		// Remove validating class and add result class
		element.classList.remove(
			styles.validating,
			styles.correct,
			styles.incorrect,
		);
		element.classList.add(result.isCorrect ? styles.correct : styles.incorrect);
	} catch (error) {
		notifications.show({
			title: "Error",
			message: "Failed to validate response",
			color: "red",
			autoClose: 5000,
		});
	}
}

interface DynamicFormProps {
	html: string;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ html }) => {
	const formRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!formRef.current) return;

		// Clear existing content
		formRef.current.innerHTML = html;

		// Find all input elements and add event listeners
		const inputs = formRef.current.querySelectorAll("input, select, textarea");
		for (const input of inputs) {
			input.addEventListener("change", (e) => {
				const target = e.target as HTMLInputElement;
				validateResponse(formRef.current as HTMLElement, target);
			});
		}

		// Cleanup function to remove event listeners
		return () => {
			if (!formRef.current) return;
			const inputs = formRef.current.querySelectorAll(
				"input, select, textarea",
			);
			for (const input of inputs) {
				input.removeEventListener("change", () => {});
			}
		};
	}, [html]); // Re-run when html changes

	return (
		<Paper p="xl" style={{ flex: 1, overflow: "auto" }}>
			<div ref={formRef} className={styles.dynamicForm} />
		</Paper>
	);
};
