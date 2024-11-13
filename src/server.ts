import express, { NextFunction, Request, Response } from "express";
import typia from "typia";
import expressWinston from "express-winston";
import fs from "fs";
import multer from "multer";
import path from "path";
import winston from "winston";

import { AIModel, FormGeneratorDefaults, ValidationRequest } from "./common";
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
  return `${
    now.toISOString().split("T")[0]
  }-${now.getHours()}-${now.getMinutes()}`;
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
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Request logging middleware
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    expressFormat: true,
    colorize: true,
  })
);

// Error logging middleware
app.use(
  expressWinston.errorLogger({
    winstonInstance: logger,
    meta: true,
  })
);

// Regular middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../dist")));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// API endpoints
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

      const imageData = {
        base64: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      };

      const model = req.body.model || AIModel.GPT4O;
      const systemPrompt = req.body.systemPrompt;
      const userPrompt = req.body.userPrompt;

      const formHtml = await generateFormFromImage({
        imageData,
        model,
        systemPrompt,
        userPrompt,
      });

      const response = { html: formHtml };
      saveResponse(response, "design");
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/demo/:imageName", async (req, res) => {
  const imagePath = path.join(
    __dirname,
    "../static/demo",
    req.params.imageName
  );
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const imageData = {
      base64: imageBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };

    const formHtml = await generateFormFromImage({
      imageData,
      model: AIModel.GEMINI_FLASH_8B,
      systemPrompt: FormGeneratorDefaults.systemPrompt,
      userPrompt: FormGeneratorDefaults.userPrompt,
    });

    res.json({ html: formHtml });
  } catch (error) {
    res.status(404).json({ error: "Demo image not found" });
  }
});

app.post("/api/validate", async (req, res, next) => {
  try {
    const validationRequest = typia.assert<ValidationRequest>(req.body);

    const imageBuffer = Buffer.from(validationRequest.screenshot, "base64");
    saveScreenshot(imageBuffer, "validate");

    const validation = await validateUserResponse(validationRequest);
    saveResponse(validation, "validate");
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

// Log static file requests
app.use("/static", (req, res, next) => {
  logger.info(`Static file request: ${req.url}`);
  next();
});

// Serve static files
app.use("/static", express.static(path.join(__dirname, "../static")));

// Serve index.html for all routes to support client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
