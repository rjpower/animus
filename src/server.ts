import { Buffer } from "buffer";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { createLogger } from "./logging";

import {
  CheckAnswerWebRequest,
  GenerateFormWebResponse,
  GenerationMode,
} from "./common";
import {
  CheckAnswerDefaults,
  CheckAnswerRequest,
  FormGeneratorDefaults,
  generateFormFromImage,
  GenerateFormRequest,
  validateUserResponse,
} from "./generate";

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

const logger = createLogger("server");
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
app.use(express.static(path.join(__dirname, "../dist")));

async function generateForm({
  imageData,
  modelConfig,
  generationMode,
}: GenerateFormRequest): Promise<GenerateFormWebResponse> {
  const formResponse = await generateFormFromImage({
    imageData,
    modelConfig,
    generationMode,
  });

  // Generate thumbnail
  const imageBuffer = Buffer.from(imageData.base64, "base64");
  const thumbnail = await sharp(imageBuffer)
    .resize(600, 600, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 50 })
    .toBuffer();

  const response = {
    ...formResponse,
    thumbnail: `data:image/jpeg;base64,${thumbnail.toString("base64")}`,
  };

  return response;
}

app.post(
  "/api/design",
  upload.single("image"),
  async (
    req: Request & { file?: Express.Multer.File },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      if (!req.body.modelConfig) {
        res.status(400).json({ error: "No modelConfig provided" });
        return;
      }

      const modelConfig = JSON.parse(req.body.modelConfig);

      const request: GenerateFormRequest = {
        imageData: {
          base64: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
        modelConfig,
        generationMode: req.body.generationMode as GenerationMode,
      };

      if (!request.generationMode) {
        res.status(400).json({ error: "No generationMode provided" });
        return;
      }

      const response = await generateForm(request);

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/demo/:imageName", async (req, res, next) => {
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

    const request = {
      imageData: {
        base64: imageBuffer.toString("base64"),
        mimeType: metadata.format === "png" ? "image/png" : "image/jpeg",
      },
      modelConfig: {
        model: FormGeneratorDefaults.model,
        apiKeys: {
          openai: process.env.OPENAI_API_KEY,
          anthropic: process.env.ANTHROPIC_API_KEY,
          gemini: process.env.GEMINI_API_KEY,
        },
      },
      generationMode: generationMode,
    } as GenerateFormRequest;

    const response = await generateForm(request);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.post("/api/validate", async (req, res, next) => {
  try {
    const webRequest = req.body as CheckAnswerWebRequest;
    const validationRequest: CheckAnswerRequest = {
      ...webRequest,
      modelConfig: {
        model: webRequest.modelConfig?.model || CheckAnswerDefaults.model,
        apiKeys: {
          openai:
            webRequest.modelConfig?.apiKeys.openai ||
            process.env.OPENAI_API_KEY,
          anthropic:
            webRequest.modelConfig?.apiKeys.anthropic ||
            process.env.ANTHROPIC_API_KEY,
          gemini:
            webRequest.modelConfig?.apiKeys.gemini ||
            process.env.GEMINI_API_KEY,
        },
      },
    };

    console.log("validationRequest", validationRequest);

    const validation = await validateUserResponse(validationRequest);
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.trace(err);
  res.status(500).json({ error: "Internal server error" });
});

// Serve static files
app.use("/static", express.static(path.join(__dirname, "../static")));
app.use("/", express.static(path.join(__dirname, "../dist/client")));

// Serve index.html for all routes to support client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/client/index.html"));
});
app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});
