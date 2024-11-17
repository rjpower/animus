import {
  Button,
  Container,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { AI_MODELS, ClientConfig } from "./types";

export const Config: React.FC = () => {
  const storedConfig = localStorage.getItem("clientConfig");
  const initialConfig = storedConfig
    ? JSON.parse(storedConfig)
    : new ClientConfig();

  const form = useForm({
    initialValues: initialConfig,
    onValuesChange: (values) => {
      localStorage.setItem("clientConfig", JSON.stringify(values));
    },
  });

  return (
    <Container>
      <Title order={1} mb="xl">
        Configuration
      </Title>
      <form>
        <Stack>
          <Select
            label="Generation Model"
            description="Select the AI model to use for form generation"
            {...form.getInputProps("generationModel")}
            data={Object.keys(AI_MODELS).map((model) => ({
              value: model,
              label: model,
            }))}
          />

          <Select
            label="Validation Model"
            description="Select the AI model to use for answer validation"
            {...form.getInputProps("validationModel")}
            data={Object.keys(AI_MODELS).map((model) => ({
              value: model,
              label: model,
            }))}
          />
        </Stack>

        <Stack mt="xl">
          <Text size="lg" fw={500}>
            API Keys
          </Text>
          <TextInput
            label="OpenAI API Key"
            type="password"
            {...form.getInputProps("apiKeys.openai")}
            placeholder="sk-..."
          />
          <TextInput
            label="Anthropic API Key"
            type="password"
            {...form.getInputProps("apiKeys.anthropic")}
            placeholder="sk-ant-..."
          />
          <TextInput
            label="Google Gemini API Key"
            type="password"
            {...form.getInputProps("apiKeys.gemini")}
            placeholder="AI..."
          />
        </Stack>

        <Button type="submit" mt="xl">
          Save Configuration
        </Button>
      </form>
    </Container>
  );
};
