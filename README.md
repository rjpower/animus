# Animus Codex

Animus Codex is a web application designed to generate forms based on images
using various AI models. The application allows users to upload images and
generate corresponding form code, either by replicating the original layout or
creating a new design. It supports multiple AI models and provides a
user-friendly interface for configuration and interaction.

I... could not think of a better name.

[Video Demo](https://rjp.io/static/animus-demo.mp4)

## Code Organzation

Everything is in src. The client root is `src/App.tsx`, server is in
`src/server.ts`. I'll be honest, [Aider](https://github.com/Aider-AI/aider)
wrote a fair bit of the code here. You can blame me for anything that looks
impressively dumb.

## Setup Instructions

```bash
git clone https://github.com/rjpower/animus.git
cd animus
npm install
npm run dev
```

### Running with Docker Compose

1. **Build and run the application**:

   ```bash
   docker-compose up --build
   ```

2. **Access the application**:
   - Open your web browser and navigate to `http://localhost:3000`.

## Configuration

The server expects the usual environment variables for API keys to render the demo links:

```env
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Contributing

Contributions are welcome, though I'm not sure where I'm going with this.

## License

This project is licensed under the Apache License - see the [LICENSE](LICENSE)
file for details.
