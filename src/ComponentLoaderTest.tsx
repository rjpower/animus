import React, { useState } from 'react';
import { Container, Grid, Textarea, Paper, Button, Text, Alert } from '@mantine/core';
import { compileComponent } from './component-loader';

const defaultCode = `
import { Stack, Group, Badge, Paper, Text, Group, Button, Alert } from '@mantine/core';
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  
  return (
    <Paper p="md" withBorder>
      <Stack>
        <Text size="xl">Component Demo</Text>
        <Group>
          <Button onClick={() => setCount(count + 1)}>
            Clicked {count} times
          </Button>
          <Badge>Demo Badge</Badge>
        </Group>
        <Alert title="Info" color="blue">
          This is a demo component showing Mantine UI integration
        </Alert>
      </Stack>
    </Paper>
  );
}
export default Component;

`.trim();

export const ComponentLoaderTest: React.FC = () => {
  const [code, setCode] = useState(defaultCode);
  const [error, setError] = useState<string | null>(null);
  const [CompiledComponent, setCompiledComponent] =
    useState<React.ComponentType | null>(null);

  const handleCompile = () => {
    try {
      const component = compileComponent(code);
      setCompiledComponent(() => component);
      setError(null);
    } catch (err) {
      console.log(err);
      if (err instanceof Error) {
        const errMessage = `${err.message}\n${err.stack}`;
        setError(errMessage);
      } else {
        setError(`An error occurred while compiling the component: ${err}`);
      }
      setCompiledComponent(null);
    }
  };

  return (
    <Container size="xl">
      <Grid>
        <Grid.Col span={6}>
          <Textarea
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            minRows={20}
            placeholder="Enter your component code here..."
            styles={{
              input: {
                fontFamily: "monospace",
                minHeight: "50vh",
                height: "100%",
              },
              root: {
                height: "100%",
              },
            }}
          />
          <Button onClick={handleCompile} mt="md">
            Compile & Run
          </Button>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper p="md" withBorder style={{ minHeight: "50vh" }}>
            {error ? (
              <Alert color="red" title="Compilation Error">
                {error}
              </Alert>
            ) : CompiledComponent ? (
              <CompiledComponent />
            ) : (
              <Text c="dimmed">Compiled component will appear here</Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
};
