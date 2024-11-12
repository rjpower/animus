import { Container, Title, Text, Button, Image, Stack, Paper } from "@mantine/core";
import React from "react";
import { Link } from "react-router-dom";

export const Landing: React.FC = () => {
  return (
			<Container size="lg">
				<div style={{ position: "relative", marginBottom: "2rem" }}>
					<Image
						src="/static/hero.jpg"
						alt="Ancient book"
						height={400}
						style={{
							width: "100%",
							objectFit: "cover",
							borderRadius: "8px",
						}}
					/>
					<Paper
						p="xl"
						style={{
							position: "absolute",
							bottom: 20,
							left: 20,
							maxWidth: "60%",
							backgroundColor: "rgba(0, 0, 0, 0.7)",
							color: "white",
						}}
					>
						<Title order={1}>The Animus Codex</Title>
						<Text size="lg">A living book that learns and grows with you</Text>
					</Paper>
				</div>

				<Stack>
					<Text size="lg">
						Legend speaks of an ancient tome, the Animus Codex, that possessed
						an uncanny ability to understand and respond to its readers. Unlike
						ordinary books, it was said to learn from each interaction, growing
						more knowledgeable with every conversation.
					</Text>

					<Text size="lg">
						What was once thought to be mere myth has been reborn through modern
						technology. The Animus Codex project brings this legendary concept
						to life, creating an interactive experience that combines the
						timeless appeal of books with cutting-edge artificial intelligence.
					</Text>

					<div style={{ textAlign: "center", margin: "2rem 0" }}>
						<Button
							component={Link}
							to="/book"
							size="lg"
							variant="gradient"
							gradient={{ from: "indigo", to: "cyan" }}
						>
							Experience the Codex
						</Button>
					</div>
				</Stack>
			</Container>
		);
};
