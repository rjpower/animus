import {
  AppShell,
  Button,
  Container,
  Group,
  Image,
  MantineProvider,
  Burger,
  Drawer,
  Stack,
  Text,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
  const [opened, { toggle, close }] = useDisclosure(false);
  return (
    <MantineProvider>
      <Notifications position="top-right" />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell padding="md">
          <AppShell.Header>
            <Container size="lg" h={60} px="xs">
              <Group h="100%" justify="space-between">
                <Group gap="xs">
                  <Image
                    src="/static/navbar.jpg"
                    height={40}
                    width={40}
                    radius="md"
                    alt="Animus Codex"
                  />
                  <Group gap="xs" visibleFrom="sm">
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
                  <Burger opened={opened} onClick={toggle} hiddenFrom="sm" />
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
          <AppShell.Footer>
            <Container size="lg" h="100%">
              <Group justify="space-between" h="100%">
                <Text size="sm" c="dimmed">
                  © {new Date().getFullYear()} Animus Codex. All rights
                  reserved.
                </Text>
                <Anchor
                  href="https://github.com/rjpower/animus"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  c="dimmed"
                >
                  View on GitHub
                </Anchor>
              </Group>
            </Container>
          </AppShell.Footer>
        </AppShell>
        <Drawer
          opened={opened}
          onClose={close}
          size="xs"
          padding="md"
          hiddenFrom="sm"
          title="Menu"
        >
          <Stack>
            <Button
              component={Link}
              to="/design"
              variant="subtle"
              color="gray"
              onClick={close}
              fullWidth
            >
              Design
            </Button>
            <Button
              component={Link}
              to="/config"
              variant="subtle"
              color="gray"
              onClick={close}
              fullWidth
            >
              Settings
            </Button>
            <Button
              component={Link}
              to="/about"
              variant="subtle"
              color="gray"
              onClick={close}
              fullWidth
            >
              About
            </Button>
          </Stack>
        </Drawer>
      </Router>
    </MantineProvider>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
