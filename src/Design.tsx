import {
  Button,
  Group,
  LoadingOverlay,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { DynamicForm } from "./DynamicForm";
import { AIModel, GenerateFormWebResponse, GenerationMode } from "./common";
import { Link } from "react-router-dom";

function demoButton(
  demoLink: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setFormCode: React.Dispatch<React.SetStateAction<string>>,
  generationMode: GenerationMode
) {
  const fileName = demoLink.split("/").pop()?.split(".")[0] || "Demo";
  return (
    <Button
      variant="light"
      onClick={async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/demo/${demoLink}?generationMode=${generationMode}`
          );
          const data: GenerateFormWebResponse = await response.json();
          setFormCode(data.app);
        } catch (error) {
          console.error("Error loading demo:", error);
          showNotification({
            title: "Error",
            message: `Error loading demo. Please try again: ${error}`,
            color: "red",
          });
        } finally {
          setLoading(false);
        }
      }}
    >
      {fileName}
    </Button>
  );
}

export const Design: React.FC = () => {
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
  const [generationMode, setGenerationMode] = useState<GenerationMode>(
    GenerationMode.REPLICATE
  );
  const form = useForm({});

  const hasApiKey = () => {
    return !!(
      localStorage.getItem("openai_api_key") ||
      localStorage.getItem("gemini_api_key") ||
      localStorage.getItem("anthropic_api_key")
    );
  };

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
    formData.append("generationMode", generationMode);
    formData.append(
      "modelConfig",
      JSON.stringify({
        model:
          localStorage.getItem("generationModel") ||
          AIModel.GEMINI_FLASH_LATEST,
        apiKeys: {
          openai: localStorage.getItem("openai_api_key") || "",
          gemini: localStorage.getItem("gemini_api_key") || "",
          anthropic: localStorage.getItem("anthropic_api_key") || "",
        },
      })
    );

    try {
      const response = await fetch("/api/design", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as GenerateFormWebResponse;
      setFormCode(data.app);
    } catch (error) {
      console.error("Error uploading image:", error);
      showNotification({
        title: "Error",
        message: `Error uploading image. Please try again: ${error}`,
        color: "red",
      });
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
        <Stack gap="md">
          <SegmentedControl
            fullWidth
            value={generationMode}
            onChange={(value) => setGenerationMode(value as GenerationMode)}
            data={[
              {
                label: "Match Original Layout",
                value: GenerationMode.REPLICATE,
              },
              { label: "Create New Design", value: GenerationMode.GENERATE },
            ]}
          />
          <Paper
            p="md"
            {...(hasApiKey() ? getRootProps() : {})}
            style={{
              border: "2px dashed #ccc",
              borderRadius: "8px",
              cursor: hasApiKey() ? "pointer" : "not-allowed",
              minHeight: "100px",
              opacity: hasApiKey() ? 1 : 0.6,
              position: "relative",
            }}
          >
            {hasApiKey() ? (
              <>
                <input {...getInputProps()} />
                <Stack align="center" justify="center" h="100%">
                  <Text size="md" fw={500} ta="center">
                    {isDragActive
                      ? "Drop the image here"
                      : selectedFile
                      ? `Selected: ${selectedFile.name}`
                      : "Drag and drop or select an image"}
                  </Text>
                  <Button size="sm">Select Image</Button>
                </Stack>
              </>
            ) : (
              <Stack align="center" justify="center" h="100%">
                <Text size="md" fw={500} ta="center">
                  Configure an API key in the <Link to="/config">settings</Link>{" "}
                  to use your own images
                </Text>
              </Stack>
            )}
          </Paper>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="xs">
              <Button type="submit" disabled={!selectedFile} fullWidth>
                Generate Form
              </Button>
              <Text size="xs" c="dimmed" ta="center">
                Note: Form generation may take up to 30 seconds
              </Text>
            </Stack>
          </form>
        </Stack>

        <Paper p="md" withBorder mt="md">
          <Text size="sm" mb="xs">
            Or try it with some demo images:
          </Text>
          <Group grow>
            <Stack>
              <Group>
                {demoButton(
                  "tobira-4.2.jpg",
                  setLoading,
                  setFormCode,
                  generationMode
                )}
                {demoButton(
                  "arithmetic.png",
                  setLoading,
                  setFormCode,
                  generationMode
                )}
              </Group>
            </Stack>
          </Group>
        </Paper>
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
