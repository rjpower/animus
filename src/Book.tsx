import { Button, Group, LoadingOverlay, Paper, Text, Textarea } from '@mantine/core';
import '@mantine/core/styles.css';
import { useForm } from '@mantine/form';
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DynamicForm } from "./DynamicForm";
import { AIModel, DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT } from "./common";

export const Book: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formHtml, setFormHtml] = useState<string>(
			`Generated form will appear here.`,
		);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const form = useForm({
    initialValues: {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPrompt: DEFAULT_USER_PROMPT,
    },
    validate: {
      systemPrompt: (value) => (value.length < 10 ? 'System prompt must be at least 10 characters' : null),
      userPrompt: (value) => (value.length < 10 ? 'User prompt must be at least 10 characters' : null),
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('model', localStorage.getItem('selectedModel') || AIModel.GPT4O);
    formData.append('systemPrompt', form.values.systemPrompt);
    formData.append('userPrompt', form.values.userPrompt);

    try {
      const response = await fetch('/api/design', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setFormHtml(data.html);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  return (
    <div style={{ 
      position: 'relative',
      display: 'flex',
      gap: '1rem',
      height: 'calc(100vh - 60px)', // Adjust based on your header/navigation height
      padding: '1rem'
    }}>
      <LoadingOverlay visible={loading} />
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Paper
          p="xl"
          {...getRootProps()}
          style={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <input {...getInputProps()} />
          <Group justify="center" align="center" gap="md">
            <Text size="xl" fw={500}>
              {isDragActive
                ? 'Drop the image here'
                : selectedFile 
                  ? `Selected: ${selectedFile.name}`
                  : 'Drag and drop an image here, or click to select'}
            </Text>
            <Button>Select Image</Button>
          </Group>
        </Paper>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Textarea
            label="System Prompt"
            minRows={6}
            autosize={true}
            {...form.getInputProps('systemPrompt')}
          />

          <Textarea
            label="User Prompt"
            minRows={6}
            autosize={true}
            {...form.getInputProps('userPrompt')}
          />

          <Button 
            type="submit"
            disabled={!selectedFile || !form.isValid()}
            size="lg"
            mt="md"
          >
          Generate Form
        </Button>
        </form>
      </div>

      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <DynamicForm html={formHtml} />
      </div>
    </div>
  );
};
