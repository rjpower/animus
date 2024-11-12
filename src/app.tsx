import React from "react";
import { createRoot } from "react-dom/client";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "@mantine/core/styles.css";
import {
	AppShell,
	Container,
	Group,
	MantineProvider,
	Text,
	Title,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { Image } from "@mantine/core";
import { Book } from "./Book";
import { Config } from "./Config";
import { Landing } from "./Landing";

const App: React.FC = () => {
	return (
		<MantineProvider defaultColorScheme="dark">
			<Notifications position="top-right" />
			<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<AppShell padding="md">
					<AppShell.Header>
						<Container size="lg" h={60}>
							<Group h="100%" justify="space-between">
								<Group>
									<Group>
										<Image
											src="/static/navbar.jpg"
											height={40}
											width={40}
											radius="md"
											alt="Animus Codex"
										/>
										<Title order={4}>Animus Codex</Title>
									</Group>
									<Group ml="xl">
										<Link
											to="/"
											style={{ textDecoration: "none", color: "inherit" }}
										>
											<Text fw={500}>Book</Text>
										</Link>
										<Link
											to="/config"
											style={{ textDecoration: "none", color: "inherit" }}
										>
											<Text fw={500}>Settings</Text>
										</Link>
									</Group>
								</Group>
							</Group>
						</Container>
					</AppShell.Header>
					<AppShell.Main pt={60}>
						<Routes>
							<Route path="/" element={<Landing />} />
							<Route path="/book" element={<Book />} />
							<Route path="/config" element={<Config />} />
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
