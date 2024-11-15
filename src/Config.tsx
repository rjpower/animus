import React from "react";
import { Container, Title, Select, TextInput, Stack, Text, Button } from "@mantine/core";
import { useForm } from '@mantine/form';
import { AIModel } from "./common";

export const Config: React.FC = () => {
  const form = useForm({
    initialValues: {
      generationModel: localStorage.getItem("generationModel") as AIModel || AIModel.GPT4O,
      validationModel: localStorage.getItem("validationModel") as AIModel || AIModel.GPT4O,
      apiKeys: {
        openai: localStorage.getItem("openai_api_key") || "",
        anthropic: localStorage.getItem("anthropic_api_key") || "",
        gemini: localStorage.getItem("gemini_api_key") || "",
      }
    },
    onValuesChange: (values) => {
      localStorage.setItem("generationModel", values.generationModel);
      localStorage.setItem("validationModel", values.validationModel);
      localStorage.setItem("openai_api_key", values.apiKeys.openai);
      localStorage.setItem("anthropic_api_key", values.apiKeys.anthropic);
      localStorage.setItem("gemini_api_key", values.apiKeys.gemini);
    }
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
            {...form.getInputProps('generationModel')}
            data={Object.values(AIModel).map((model) => ({
              value: model,
              label: model,
            }))}
          />

          <Select
            label="Validation Model"
            description="Select the AI model to use for answer validation"
            {...form.getInputProps('validationModel')}
            data={Object.values(AIModel).map((model) => ({
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
            {...form.getInputProps('apiKeys.openai')}
            placeholder="sk-..."
          />
          <TextInput
            label="Anthropic API Key"
            type="password"
            {...form.getInputProps('apiKeys.anthropic')}
            placeholder="sk-ant-..."
          />
          <TextInput
            label="Google Gemini API Key"
            type="password"
            {...form.getInputProps('apiKeys.gemini')}
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
