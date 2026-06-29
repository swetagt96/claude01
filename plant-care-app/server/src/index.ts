import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { analyzePlant } from "./services/aiAnalyzer.js";
import { getClimateContext } from "./services/weather.js";
import type { ClimateContext } from "./types.js";
import authRouter from "./routes/auth.js";
import plantsRouter from "./routes/plants.js";
import pushRouter from "./routes/push.js";
import { startScheduler } from "./services/push.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "15mb" }));

// Accept a single image up to 10MB in memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: process.env.OPENAI_API_KEY ? "ai" : "demo",
  });
});

// Standalone weather lookup (frontend uses this to show local climate immediately).
app.get("/api/climate", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: "lat and lon query params are required" });
  }
  const name = typeof req.query.name === "string" ? req.query.name : undefined;
  const climate = await getClimateContext(lat, lon, name);
  res.json(climate);
});

// Main endpoint: upload a photo (+ optional location) and get a full analysis.
app.post("/api/analyze", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded. Use form field 'photo'." });
    }

    let climate: ClimateContext | undefined;
    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      const name = typeof req.body.locationName === "string" ? req.body.locationName : undefined;
      climate = await getClimateContext(lat, lon, name);
    }

    const analysis = await analyzePlant(req.file.buffer, req.file.mimetype, climate);
    res.json(analysis);
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Failed to analyze the plant photo. Please try again." });
  }
});

// Accounts, cross-device garden sync, and push notifications.
app.use("/api/auth", authRouter);
app.use("/api/plants", plantsRouter);
app.use("/api/push", pushRouter);

// Multer / generic error handler.
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Unexpected error" });
  }
);

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? "AI vision" : "DEMO";
  console.log(`🌱 Plant Care API listening on http://localhost:${PORT} (mode: ${mode})`);
  // Begin the background watering-reminder scheduler (sends web-push).
  startScheduler();
});
