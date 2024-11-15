import React from "react";
import { Container, Text, Title, Space, Image } from "@mantine/core";

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
        validate your answer. This is the result of trying to wire these things
        together in a bit of a janky way.
      </Text>
      <Space h="md" />
      <Text>
        You can try out the demo links and test your Japanese or math skills. If
        you configure an API key, you can also upload and generate your own
        forms. I've found that Sonnet is quite good at making good looking
        forms, but it can take up to 30 seconds to provide a response. (I
        haven't wired up streaming yet.)
      </Text>
    </Container>
  );
};
