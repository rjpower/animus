import express, { NextFunction, Request, Response } from "express";
import { Buffer } from "buffer";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { createLogger, LogLevels } from "./logging";

import {
  AIModel,
  FormGeneratorDefaults,
  GenerateFormResponse,
  ValidationRequest,
} from "./common";
import { generateFormFromImage, validateUserResponse } from "./generate";

function ensureLogDir(subDir: string): string {
  const dir = path.join(__dirname, "../log", subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${now.toISOString().split("T")[0]}-${hours}-${minutes}`;
}

function saveScreenshot(buffer: Buffer, routeName: string): string {
  const dir = ensureLogDir("screenshots");
  const filename = `${routeName}-${getTimestamp()}.png`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

function saveResponse(data: any, routeName: string): string {
  const dir = ensureLogDir("responses");
  const filename = `${routeName}-${getTimestamp()}.json`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Logging middleware
const logger = createLogger("server");

// Request logging middleware
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

// Error logging middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Regular middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../dist")));

// API endpoints
async function processImageAndGenerateForm(
  imageBuffer: Buffer,
  mimeType: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  routeName: string
): Promise<GenerateFormResponse> {
  const responseDir = ensureLogDir("responses");
  const files = fs
    .readdirSync(responseDir)
    .filter((file) => file.startsWith(`${routeName}-`))
    .sort()
    .reverse();

  logger.debug(files);

  if (files.length > 0) {
    const latestFile = path.join(responseDir, files[0]);
    const previousResponse = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
    // log keys to console
    logger.debug(Object.keys(previousResponse));
    if (previousResponse) {
      return previousResponse;
    }
  }

  const imageData = {
    base64: imageBuffer.toString("base64"),
    mimeType,
  };

  const formResponse = await generateFormFromImage({
    imageData,
    model,
    systemPrompt,
    userPrompt,
  });

  // Generate thumbnail
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

  saveResponse(response, routeName);
  return response;
}

app.post(
  "/api/design",
  upload.single("image"),
  async (req: Request & { file?: Express.Multer.File }, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      saveScreenshot(req.file.buffer, "design");

      const response = await processImageAndGenerateForm(
        req.file.buffer,
        req.file.mimetype,
        req.body.model || FormGeneratorDefaults.model,
        req.body.systemPrompt || FormGeneratorDefaults.systemPrompt,
        req.body.userPrompt || FormGeneratorDefaults.userPrompt,
        "design"
      );
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

    const response = await processImageAndGenerateForm(
      imageBuffer,
      "image/jpeg",
      FormGeneratorDefaults.model,
      FormGeneratorDefaults.systemPrompt,
      FormGeneratorDefaults.userPrompt,
      "demo"
    );

    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.post("/api/validate", async (req, res, next) => {
  try {
    const validationRequest = req.body as ValidationRequest;

    if (validationRequest.screenshot) {
      const imageBuffer = Buffer.from(validationRequest.screenshot!, "base64");
      saveScreenshot(imageBuffer, "validate");
    }

    const validation = await validateUserResponse(validationRequest);
    saveResponse(validation, "validate");
    res.json(validation);
  } catch (error) {
    next(error);
  }
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
