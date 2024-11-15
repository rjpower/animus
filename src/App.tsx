import {
  AppShell,
  Button,
  Container,
  Group,
  Image,
  MantineProvider,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { About } from "./About";
import { Config } from "./Config";
import { Design } from "./Design";

const App: React.FC = () => {
  return (
    <MantineProvider>
      <Notifications position="top-right" />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell padding="md">
          <AppShell.Header>
            <Container size="lg" h={60}>
              <Group h="100%" justify="space-between">
                <Group>
                  <Group ml="xl">
                    <Image
                      src="/static/navbar.jpg"
                      height={40}
                      width={40}
                      radius="md"
                      alt="Animus Codex"
                    />
                    <Button
                      component={Link}
                      to="/design"
                      variant="subtle"
                      color="gray"
                    >
                      Design
                    </Button>
                    <Button
                      component={Link}
                      to="/config"
                      variant="subtle"
                      color="gray"
                    >
                      Settings
                    </Button>
                    <Button
                      component={Link}
                      to="/about"
                      variant="subtle"
                      color="gray"
                    >
                      About
                    </Button>
                  </Group>
                </Group>
                <Button
                  component="a"
                  href="https://github.com/rjpower/animus"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  leftSection={
                    <Image
                      src="/static/github-mark.svg"
                      height={24}
                      width={24}
                      alt="GitHub"
                    />
                  }
                >
                  GitHub
                </Button>
              </Group>
            </Container>
          </AppShell.Header>
          <AppShell.Main pt={60}>
            <Routes>
              <Route path="/" element={<About />} />
              <Route path="/design" element={<Design />} />
              <Route path="/config" element={<Config />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </AppShell.Main>
        </AppShell>
      </Router>
    </MantineProvider>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
