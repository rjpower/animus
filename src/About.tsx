import React from "react";
import { Container, Text, Title, Space, Image, Paper } from "@mantine/core";
import { Link } from "react-router-dom";

export const About: React.FC = () => {
  return (
    <Container size="md">
      <Space h="md" />
      <Image
        src="/static/hero.jpg"
        height={300}
        fit="contain"
        alt="Animus Codex Hero"
      />
      <Space h="md" />
      <strong>TLDR: Interactive textbooks using LLMs:</strong>
      <i>
        It kind of works, but I won't be replacing my textbook with it tomorrow.
      </i>
      <Space h="md" />
      <Text>
        I was trying to work through my Japanese workbook the other day, and as
        one does, I found myself taking pictures with my phone and asking
        ChatGPT to provide feedback on my answers.
      </Text>
      <Space h="md" />
      <Text>
        I found myself thinking that this workflow was... non-optimal: wouldn't
        it be neat if I could instead my the workbook image into a interactive
        app directly? Then I could get instant feedback and avoid having to
        provide context etc. It turns out that LLMs are pretty good at the form
        generation, but you need to be able to call back into an LLM in order to
        validate your answer.
      </Text>
      <Space h="md" />
      <Text>
        Head over to the <Link to="/design">design</Link> page to see how it and
        try out the demo links to test your Japanese or math skills. If you
        configure an API key, you can also upload and generate your own forms.
        I've found that Sonnet is quite good at making good looking forms, but
        it can take up to 30 seconds to provide a response. (I haven't wired up
        streaming yet.)
      </Text>
      <Space h="md" />
      <Text>
        The code for this project is available on{" "}
        <a href="https://github.com/rjpower/animus">Github</a>.
      </Text>
    </Container>
  );
};
