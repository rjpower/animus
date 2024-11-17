import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { createLogger } from "./logging";

import {
  CheckAnswerRequest,
  FormFromImageRequest,
  FormFromPromptRequest,
  generateFormFromImage,
  generateFormFromPrompt,
  validateUserResponse,
} from "./generate";
import {
  AI_MODELS,
  CheckAnswerWebRequest,
  ClientConfig,
  GenerationMode,
} from "./types";

interface ApiKeyResult {
  key: string | undefined;
  fromEnv: boolean;
}

const logger = createLogger("server");
class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(tokensPerDay: number) {
    this.maxTokens = tokensPerDay;
    this.tokens = tokensPerDay;
    this.lastRefill = Date.now();
    this.refillRate = tokensPerDay / (24 * 60 * 60 * 1000);
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  add(tokens: number): void {
    this.refill();

    logger.info(`Rate limiter: tokens=${this.tokens}, adding=${tokens}`);

    if (this.tokens < tokens) {
      throw new RateLimitError("Rate limit exceeded");
    }

    this.tokens -= tokens;
  }
}

const rateLimiter = new RateLimiter(100000);

const lookupApiKey = (
  model: keyof typeof AI_MODELS,
  config: ClientConfig
): ApiKeyResult => {
  const provider = AI_MODELS[model].provider;
  const apiKey = config.apiKeys[provider];
  if (!apiKey) {
    return {
      key: process.env[`${provider.toUpperCase()}_API_KEY`],
      fromEnv: true,
    };
  }
  return { key: apiKey, fromEnv: false };
};

const demoForm = async (req: Request, res: Response, next: NextFunction) => {
  const imagePath = path.join(
    __dirname,
    "../static/demo",
    req.params.imageName
  );

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const metadata = await sharp(imageBuffer).metadata();
    const generationMode =
      (req.query.generationMode as GenerationMode) || GenerationMode.REPLICATE;

    const model = "claude-3-5-sonnet-20241022";
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "No API key available for model claude-3-5-sonnet-20241022"
      );
    }

    const request: FormFromImageRequest = {
      imageData: {
        base64: imageBuffer.toString("base64"),
        mimeType: metadata.format === "png" ? "image/png" : "image/jpeg",
      },
      generationMode: generationMode,
      modelConfig: {
        model: model,
        apiKey: apiKey,
      },
    };

    const response = await generateFormFromImage(request);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

const designFromImage = async (
  req: Request & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const clientConfig = typeof req.body.clientConfig === 'string' 
      ? JSON.parse(req.body.clientConfig) 
      : req.body.clientConfig as ClientConfig;
    const apiKeyResult = lookupApiKey(
      clientConfig.generationModel,
      clientConfig
    );

    if (!apiKeyResult.key) {
      res.status(400).json({
        error: `No API key available for model ${clientConfig.generationModel}`,
      });
      return;
    }

    if (apiKeyResult.fromEnv) {
      rateLimiter.add(1000 + 500 + 500);
    }

    const request: FormFromImageRequest = {
      imageData: {
        base64: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
      modelConfig: {
        model: clientConfig.generationModel,
        apiKey: apiKeyResult.key,
      },
      generationMode: req.body.generationMode as GenerationMode,
    };

    if (!request.generationMode) {
      res.status(400).json({ error: "No generationMode provided" });
      return;
    }
    const response = await generateFormFromImage(request);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

const designFromPrompt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.body.prompt) {
      res.status(400).json({ error: "No prompt provided" });
      return;
    }
    const clientConfig = JSON.parse(req.body.clientConfig);
    const apiKeyResult = lookupApiKey(
      clientConfig.generationModel,
      clientConfig
    );

    if (!apiKeyResult.key) {
      res.status(400).json({
        error: `No API key available for model ${clientConfig.generationModel}`,
      });
      return;
    }

    if (apiKeyResult.fromEnv) {
      rateLimiter.add(1000 + 500 + 500);
    }
    const request: FormFromPromptRequest = {
      prompt: req.body.prompt,
      modelConfig: {
        model: clientConfig.generationModel,
        apiKey: apiKeyResult.key,
      },
    };
    const response = await generateFormFromPrompt(request);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

const validateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const webRequest = req.body as CheckAnswerWebRequest;
    const model = webRequest.clientConfig.validationModel;
    const apiKeyResult = lookupApiKey(model, webRequest.clientConfig);

    if (!apiKeyResult.key) {
      res
        .status(400)
        .json({ error: `No API key available for model ${model}` });
      return;
    }

    if (apiKeyResult.fromEnv) {
      rateLimiter.add(JSON.stringify(webRequest).split(" ").length * 3);
    }

    const validationRequest: CheckAnswerRequest = {
      ...webRequest,
      modelConfig: {
        model: model,
        apiKey: apiKeyResult.key,
      },
    };

    const validation = await validateUserResponse(validationRequest);
    res.json(validation);
  } catch (error) {
    next(error);
  }
};

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      `HTTP ${req.method} ${req.url} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.post("/api/design/image", upload.single("image"), designFromImage);
app.post("/api/design/text", upload.none(), designFromPrompt);
app.post("/api/validate", validateRequest);
app.get("/api/demo/:imageName", demoForm);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.trace(err);
  if (err instanceof RateLimitError) {
    res
      .status(429)
      .json({ error: "Rate limit exceeded. Please try again later." });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "../dist"), { maxAge: "1h" }));
app.use(
  "/static",
  express.static(path.join(__dirname, "../static"), { maxAge: "1h" })
);
app.use("/", express.static(path.join(__dirname, "../dist/client")));

// Serve index.html for all routes to support client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/client/index.html"));
});
app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});
