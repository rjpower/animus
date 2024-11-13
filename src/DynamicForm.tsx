import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import html2canvas from "html2canvas";
import React, { useEffect, useRef, useState } from "react";
import type { ValidationRequest, ValidationResponse } from "./common";
import { AIModel } from "./common";
import { compileComponent } from "./component-loader";
import * as styles from "./styles.module.css";

export async function validateResponse(
  parent: HTMLElement,
  element: HTMLElement
) {
  // Clear highlights from all input elements
  const allInputs = parent.querySelectorAll("input, select, textarea");
  for (const input of allInputs) {
    input.classList.remove(styles.validating, styles.correct, styles.incorrect);
  }

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
      message: <div>{result.feedback}</div>,
      color: result.isCorrect ? "green" : "red",
      autoClose: 5000,
    });

    // Remove validating class and add result class
    element.classList.remove(
      styles.validating,
      styles.correct,
      styles.incorrect
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
  onValidate?: (element: HTMLElement) => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  html,
  onValidate,
}) => {
  const [DynamicComponent, setDynamicComponent] =
    useState<React.ComponentType | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const CompiledComponent = compileComponent(html);
      setDynamicComponent(() => CompiledComponent);
    } catch (error) {
      console.log(error);
      notifications.show({
        title: "Error",
        message: "Failed to compile component",
        color: "red",
        autoClose: 5000,
      });
    }
  }, [html]);

  const handleInputChange = async (e: React.FormEvent<HTMLDivElement>) => {
    if (!formRef.current) return;

    const target = e.target as HTMLElement;
    if (onValidate) {
      onValidate(target);
    } else {
      await validateResponse(formRef.current, target);
    }
  };

  return (
    <Paper p="xl" style={{ flex: 1, overflow: "auto" }}>
      <div
        ref={formRef}
        className={styles.dynamicForm}
        onChange={handleInputChange}
      >
        {DynamicComponent ? <DynamicComponent /> : null}
      </div>
    </Paper>
  );
};
