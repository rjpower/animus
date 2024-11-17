// Renders LLM-generated code after compilation, and provides validation callbacks.

import {
  Alert,
  Group,
  MantineProvider,
  Paper,
  Button,
  Code,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import React, { useEffect, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";
import {
  CheckAnswerWebRequest,
  CheckAnswerWebResponse,
  ClientConfig,
} from "./types";
import { compileComponent } from "./component-loader";
import { createLogger } from "./logging";

const logger = createLogger("DynamicForm");

export async function checkUserAnswers(
  request: CheckAnswerWebRequest
): Promise<CheckAnswerWebResponse> {
  try {
    const storedConfig = localStorage.getItem("clientConfig");
    const clientConfig = storedConfig
      ? JSON.parse(storedConfig)
      : new ClientConfig();

    const response = await fetch("/api/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...request, clientConfig }),
    });
    return (await response.json()) as CheckAnswerWebResponse;
  } catch (error) {
    notifications.show({
      title: "Error",
      message: `Failed to validate answer: ${error}`,
      color: "red",
    });
    throw error;
  }
}

interface UserCodeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class UserCodeErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  UserCodeErrorBoundaryState
> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    logger.error("Caught error in LLM code.", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Group>
          <strong>User Component Error</strong>
          <div className="text-sm">
            An error occurred when rendering the dynamic component.
            <br />
            {this.state.error?.toString()}
          </div>
        </Group>
      );
    }
    return this.props.children;
  }
}

interface DynamicFormProps {
  code: string;
  onValidate?: (element: HTMLElement) => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ReactDOM.Root | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showSource, setShowSource] = useState(false);

  // Create new root when switching to preview mode
  useEffect(() => {
    if (!showSource && containerRef.current) {
      const newRoot = ReactDOM.createRoot(containerRef.current);
      setRoot(newRoot);
    }
  }, [showSource]);

  // Handle component updates
  useEffect(() => {
    if (!root) return;

    let isMounted = true;

    const renderComponent = async () => {
      try {
        const CompiledComponent = compileComponent({
          code,
          userCtx: { checkUserAnswers },
        });

        if (isMounted) {
          root.render(
            <MantineProvider>
              <UserCodeErrorBoundary>
                <CompiledComponent />
              </UserCodeErrorBoundary>
            </MantineProvider>
          );
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err : new Error("Failed to compile component")
        );
        notifications.show({
          title: "Error",
          message: "Failed to compile component",
          color: "red",
          autoClose: 5000,
        });
      }
    };

    renderComponent();

    return () => {
      isMounted = false;
    };
  }, [code, root]);

  // Cleanup root on unmount
  useEffect(() => {
    return () => {
      if (root) {
        // Use a timeout to ensure any pending renders complete
        setTimeout(() => {
          root.unmount();
        }, 0);
      }
    };
  }, [root]);

  return (
    <Paper p="xl" style={{ flex: 1, overflow: "auto" }}>
      <Group align="right" mb="md">
        <Button
          size="xs"
          variant="subtle"
          onClick={() => setShowSource(!showSource)}
        >
          {showSource ? "Show Preview" : "View Source"}
        </Button>
      </Group>

      {showSource ? <Code block>{code}</Code> : <div ref={containerRef} />}

      {error && (
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      )}
    </Paper>
  );
};
