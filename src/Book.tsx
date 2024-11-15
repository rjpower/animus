import {
  Button,
  Group,
  LoadingOverlay,
  Paper,
  Text,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { useForm } from "@mantine/form";
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { DynamicForm } from "./DynamicForm";
import { FormGeneratorDefaults, GenerateFormResponse } from "./common";

function demoButton(
  demoLink: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setFormCode: React.Dispatch<React.SetStateAction<string>>
) {
  const fileName = demoLink.split("/").pop()?.split(".")[0] || "Demo";
  return (
    <Button
      variant="light"
      onClick={async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/demo/${demoLink}`);
          const data: GenerateFormResponse = await response.json();
          setFormCode(data.app);
        } catch (error) {
          console.error("Error loading demo:", error);
        } finally {
          setLoading(false);
        }
      }}
    >
      {fileName} Worksheet
    </Button>
  );
}

export const Book: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formCode, setFormCode] = useState<string>(
    `
function Component() {
  return <div>Generated form will appear here.</div>;
}

export default Component;
`
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const form = useForm({});

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch("/api/design", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setFormCode(data.app);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
    },
  });

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: "1rem",
        height: "calc(100vh - 60px)", // Adjust based on your header/navigation height
        padding: "1rem",
      }}
    >
      <LoadingOverlay visible={loading} />

      <div style={{ flex: 1, overflow: "auto" }}>
        <Group grow>
          <Text size="sm">Demo links:</Text>
          {demoButton("tobira-4.2.jpg", setLoading, setFormCode)}
          {demoButton("tobira-5.3.jpg", setLoading, setFormCode)}
          {demoButton("tobira-5.9.jpg", setLoading, setFormCode)}
        </Group>

        <Paper
          p="xl"
          {...getRootProps()}
          style={{
            border: "2px dashed #ccc",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "1rem",
          }}
        >
          <input {...getInputProps()} />
          <Group justify="center" align="center">
            <Text size="xl" fw={500}>
              {isDragActive
                ? "Drop the image here"
                : selectedFile
                ? `Selected: ${selectedFile.name}`
                : "Drag and drop an image here, or click to select"}
            </Text>
            <Button>Select Image</Button>
          </Group>
        </Paper>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Button type="submit" disabled={!selectedFile} size="lg" mt="md">
            Generate Form
          </Button>
        </form>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DynamicForm code={formCode} />
      </div>
    </div>
  );
};
