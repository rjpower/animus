import { Alert, MantineProvider, Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import React, { useEffect, useRef } from "react";
import * as ReactDOM from "react-dom/client";
import type { ValidationRequest, ValidationResponse } from "./common";
import { compileComponent } from "./component-loader";
import { createLogger } from "./logging";

import * as styles from "./styles.module.css";

const logger = createLogger("DynamicForm");

export async function checkUserAnswers(
  request: ValidationRequest
): Promise<ValidationResponse> {
  const response = await fetch("/api/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return (await response.json()) as ValidationResponse;
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
    logger.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-2">
          <strong>User Component Error</strong>
          <div className="text-sm">
            {this.state.error?.message ||
              "An error occurred when rendering the dynamic component."}
          </div>
        </Alert>
      );
    }
    return this.props.children;
  }
}

interface DynamicFormProps {
  code: string;
  onValidate?: (element: HTMLElement) => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  code,
  onValidate,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    try {
      const CompiledComponent = compileComponent({
        code,
        userCtx: { checkUserAnswers },
      });
      const root = ReactDOM.createRoot(rootRef.current);
      root.render(
        <MantineProvider>
          <Alert />
          <UserCodeErrorBoundary>
            <CompiledComponent />
          </UserCodeErrorBoundary>
        </MantineProvider>
      );

      return () => {
        root.unmount();
      };
    } catch (error) {
      console.trace(error);
      notifications.show({
        title: "Error",
        message: "Failed to compile component",
        color: "red",
        autoClose: 5000,
      });
    }
  }, [code]);

  return (
    <Paper p="xl" style={{ flex: 1, overflow: "auto" }}>
      <div ref={formRef} className={styles.dynamicForm}>
        <div ref={rootRef} />
      </div>
    </Paper>
  );
};
