import React from "react";
import { Container, Title, Select } from "@mantine/core";
import { AIModel } from "./common";

export const Config: React.FC = () => {
  const [selectedModel, setSelectedModel] = React.useState<AIModel>(
    AIModel.GPT4O,
  );

  const handleModelChange = (value: string | null) => {
    if (!value) return;
    setSelectedModel(value as AIModel);
    localStorage.setItem("selectedModel", value);
  };

  React.useEffect(() => {
    const savedModel = localStorage.getItem("selectedModel") as AIModel;
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  return (
    <Container>
      <Title order={1} mb="xl">
        Configuration
      </Title>
      <Select
        label="AI Model"
        description="Select the AI model to use for form generation and validation"
        value={selectedModel}
        onChange={handleModelChange}
        data={Object.values(AIModel).map((model) => ({
          value: model,
          label: model,
        }))}
      />
    </Container>
  );
};
