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
      <strong>An experiment using LLMs to make textbooks interactive.</strong>
      <Space h="md" />
      <Text>
        I was trying to work through my Japanese workbook the other day, and
        found myself taking pictures with my phone and asking ChatGPT to provide
        feedback on my answers. This workflow was nice in a way, but
        non-optimal: wouldn't it be neat if I could instead my the workbook
        image into a interactive app directly?
      </Text>
      <Space h="md" />

      <Text>
        It turns out if you ask e.g. Claude for a worksheet based on an image,
        you'll get a passable result, but it will be "dead": you can type stuff
        in but the actual validation part will be a stub. The CORS setup for
        Claude prevents you from directly calling back into the API to validate
        results.
        <a href="https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/">
          (Though maybe this has changed recently.)
        </a>
      </Text>

      <Space h="md" />
      <Text>
        So this is my hacky attempt to wire things up with a little React app
        and let you build your own worksheet. It's fun, but I'm not entirely
        happy with the result: LLMs work best when you can handle the
        "lossiness" of them, and this is a bit too fragile in practice: for
        example, Claude really likes to use certain icon libraries and that will
        blow up the renderin: for example, Claude really likes to use certain
        icon libraries and that will blow up the rendering.
      </Text>
      <Space h="md" />
      <Text>
        Head over to the <Link to="/design">design</Link> page to see how it and
        try out the demo links to test your Japanese or math skills. If you
        configure an API key, you can also upload and generate your own forms.
        I've found that Sonnet is quite good at making good looking forms, but
        it can take up to 30 seconds to provide a response. (I haven't wired up
        streaming yet.)
        <br />
        If you're feeling lazy,{" "}
        <a href="https://rjp.io/static/animus-demo.mp4">
          I made a video to show the process
        </a>
        .
      </Text>
      <Space h="md" />
      <Text>
        The code for this project is available on{" "}
        <a href="https://github.com/rjpower/animus">Github</a>.
      </Text>
    </Container>
  );
};
