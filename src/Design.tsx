import {
  Box,
  Button,
  Container,
  Flex,
  Group,
  LoadingOverlay,
  Paper,
  SegmentedControl,
  Space,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { DynamicForm } from "./DynamicForm";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { ClientConfig, GenerateFormWebResponse, GenerationMode } from "./types";

interface DemoButtonProps {
  demoTitle: string;
  demoFile: string;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setGeneratedCode: React.Dispatch<React.SetStateAction<string>>;
  generationMode: GenerationMode;
}

const DemoButton: React.FC<DemoButtonProps> = ({
  demoTitle,
  demoFile,
  setLoading,
  setGeneratedCode,
  generationMode,
}) => {
  return (
    <Button
      variant="light"
      size="xs"
      onClick={async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/demo/${demoFile}?generationMode=${generationMode}`
          );
          const data: GenerateFormWebResponse = await response.json();
          setGeneratedCode(data.app);
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
      {demoTitle}
    </Button>
  );
};

interface ArithemeticDemoProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setGeneratedCode: React.Dispatch<React.SetStateAction<string>>;
}

const ArithmeticDemo: React.FC<ArithemeticDemoProps> = ({
  setLoading,
  setGeneratedCode,
}) => {
  const prompt = `Generate a basic arithmetic worksheet with 20 problems: 5 addition (numbers
 1-20), 5 subtraction (numbers 1-20), 5 multiplication (numbers 1-10), and 5
 division (numbers 1-10). Include space for student name and date.`;
  return (
    <>
      <Text c="dimmed" size="xs">
        {prompt}
      </Text>
      <Button
        variant="light"
        size="xs"
        onClick={async () => {
          setLoading(true);
          const formData = new FormData();
          formData.append("prompt", prompt);
          formData.append("clientConfig", JSON.stringify(new ClientConfig()));
          try {
            const response = await fetch("/api/design/text", {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            setGeneratedCode(data.app);
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
        Generate
      </Button>
    </>
  );
};

const Instructions: React.FC = () => {
  return (
    <>
      <Title order={3}>An experiment in interactive textbooks.</Title>
      <Text>
        Try out the demo links below, upload a photo from your own textbook, or
        try creating a worksheet from a prompt.
      </Text>
    </>
  );
};

export const Design: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string>(`
function Component() {
  return <div>Generated form will appear here.</div>;
}

export default Component;
`);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useLocalStorage<string>(
    "design-text-prompt",
    "Generate a math worksheet for a 10 year old, with 25 questions, in increasing difficulty order."
  );
  const [inputMode, setInputMode] = useLocalStorage<"image" | "text">(
    "design-input-mode",
    "image"
  );
  const [generationMode, setGenerationMode] = useLocalStorage<GenerationMode>(
    "design-generation-mode",
    GenerationMode.REPLICATE
  );
  const theme = useMantineTheme();
  const storedConfig = localStorage.getItem("clientConfig");

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      // Create thumbnail URL
      const url = URL.createObjectURL(file);
      setThumbnailUrl(url);
    }
  };

  // Cleanup thumbnail URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  const handleSubmit = async () => {
    if (inputMode === "image" && !selectedFile) return;
    if (inputMode === "text" && !textPrompt.trim()) return;

    setLoading(true);
    const formData = new FormData();
    const clientConfig = storedConfig
      ? JSON.parse(storedConfig)
      : new ClientConfig();

    if (inputMode === "image") {
      formData.append("image", selectedFile!);
      formData.append("generationMode", generationMode);
      formData.append("clientConfig", JSON.stringify(clientConfig));
    } else {
      formData.append("prompt", textPrompt);
      formData.append("clientConfig", JSON.stringify(clientConfig));
    }

    try {
      const response = await fetch(
        inputMode === "image" ? "/api/design/image" : "/api/design/text",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = (await response.json()) as GenerateFormWebResponse;
      setGeneratedCode(data.app);
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
    <Container size="sm" p="md">
      <Box pos="relative" mih={400}>
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
        <Instructions />
        <Space h="lg" />
        <Stack>
          <Tabs
            value={inputMode}
            onChange={(value) => setInputMode(value as "image" | "text")}
          >
            <Tabs.List grow>
              <Tabs.Tab value="demo">Demo</Tabs.Tab>
              <Tabs.Tab value="image">Upload Image</Tabs.Tab>
              <Tabs.Tab value="text">Text Prompt</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="image">
              <Stack mt="md">
                <Paper
                  p="md"
                  withBorder
                  {...getRootProps()}
                  style={{
                    border: `2px dashed ${theme.colors.gray[4]}`,
                    cursor: "pointer",
                  }}
                >
                  <input {...getInputProps()} />
                  <Flex
                    align="center"
                    justify="center"
                    direction="column"
                    h="100%"
                  >
                    {thumbnailUrl ? (
                      <>
                        <img
                          src={thumbnailUrl}
                          alt="Preview"
                          style={{
                            maxWidth: "200px",
                            maxHeight: "200px",
                            objectFit: "contain",
                            marginBottom: "8px",
                          }}
                        />
                        <Text size="sm" fw={500} ta="center">
                          {selectedFile?.name}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text size="sm" fw={500} ta="center">
                          {isDragActive
                            ? "Drop the image here"
                            : "Drag and drop or select an image"}
                        </Text>
                        <Button size="xs" mt="sm">
                          Select Image
                        </Button>
                      </>
                    )}
                  </Flex>
                </Paper>
                <SegmentedControl
                  fullWidth
                  value={generationMode}
                  onChange={(value) =>
                    setGenerationMode(value as GenerationMode)
                  }
                  data={[
                    {
                      label: "Match Original Layout",
                      value: GenerationMode.REPLICATE,
                    },
                    {
                      label: "Create New Design",
                      value: GenerationMode.GENERATE,
                    },
                  ]}
                />
                <Button
                  fullWidth
                  disabled={!selectedFile}
                  onClick={handleSubmit}
                >
                  Generate Worksheet from Image
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="text">
              <Stack mt="md">
                <Textarea
                  placeholder="Describe the worksheet you want to create..."
                  minRows={4}
                  value={textPrompt}
                  onChange={(event) => setTextPrompt(event.currentTarget.value)}
                />
                <Button
                  fullWidth
                  disabled={!textPrompt.trim()}
                  onClick={handleSubmit}
                >
                  Generate Worksheet from Text
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="demo">
              <Stack mt="md">
                <Paper p="md" withBorder>
                  <Title order={5}>Example Worksheets</Title>
                  <Stack>
                    <Box>
                      <Text size="sm" mb="xs" c="dimmed">
                        Construct a worksheet from a pre-existing image:
                      </Text>
                      <DemoButton
                        demoTitle="Tobira Gateway to Advanced Japanese"
                        demoFile="tobira-4.2.jpg"
                        setLoading={setLoading}
                        setGeneratedCode={setGeneratedCode}
                        generationMode={generationMode}
                      />
                    </Box>
                    <Box>
                      <Text>Or from a prompt:</Text>
                      {ArithmeticDemo({ setLoading, setGeneratedCode })}
                    </Box>
                  </Stack>
                </Paper>
                <SegmentedControl
                  fullWidth
                  value={generationMode}
                  onChange={(value) =>
                    setGenerationMode(value as GenerationMode)
                  }
                  data={[
                    {
                      label: "Match Original Layout",
                      value: GenerationMode.REPLICATE,
                    },
                    {
                      label: "Create New Design",
                      value: GenerationMode.GENERATE,
                    },
                  ]}
                />
              </Stack>
            </Tabs.Panel>
          </Tabs>

          <Text size="xs" ta="center" c="dimmed">
            Note: Worksheet generation with the default model (Sonnet) takes up
            to 30 seconds.
            <br />
            You can switch to a model like Gemini Flash for a crappy but faster
            result.
          </Text>
          <Box mt="lg">
            <DynamicForm code={generatedCode} />
          </Box>
        </Stack>
      </Box>
    </Container>
  );
};
