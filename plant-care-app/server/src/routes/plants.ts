import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../services/auth.js";
import { getDb, save, type PlantRecord } from "../store.js";

const router = Router();
router.use(requireAuth);

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function clampFrequency(value: unknown, fallback = 7): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.round(n));
}

// Strip internal fields before returning a plant to the client.
function toClient(p: PlantRecord) {
  const { userId, lastNotifiedDay, ...rest } = p;
  void userId;
  void lastNotifiedDay;
  return rest;
}

function userPlants(userId: string): PlantRecord[] {
  return getDb()
    .plants.filter((p) => p.userId === userId)
    .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime());
}

router.get("/", (req: AuthedRequest, res) => {
  res.json(userPlants(req.user!.id).map(toClient));
});

router.post("/", (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const commonName = typeof body.commonName === "string" ? body.commonName : "Unknown plant";
  const frequencyDays = clampFrequency(body.frequencyDays);
  const now = new Date();

  const plant: PlantRecord = {
    id: randomUUID(),
    userId: req.user!.id,
    nickname: (typeof body.nickname === "string" && body.nickname.trim()) || commonName,
    commonName,
    scientificName: typeof body.scientificName === "string" ? body.scientificName : "",
    imageDataUrl: typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
    frequencyDays,
    lastWatered: now.toISOString(),
    nextDue: addDays(now, frequencyDays).toISOString(),
    wateringNotes: typeof body.wateringNotes === "string" ? body.wateringNotes : undefined,
    createdAt: now.toISOString(),
  };

  getDb().plants.push(plant);
  save();
  res.status(201).json(toClient(plant));
});

function findOwned(req: AuthedRequest): PlantRecord | undefined {
  return getDb().plants.find((p) => p.id === req.params.id && p.userId === req.user!.id);
}

router.post("/:id/water", (req: AuthedRequest, res) => {
  const plant = findOwned(req);
  if (!plant) return res.status(404).json({ error: "Plant not found." });
  const now = new Date();
  plant.lastWatered = now.toISOString();
  plant.nextDue = addDays(now, plant.frequencyDays).toISOString();
  plant.lastNotifiedDay = undefined;
  save();
  res.json(toClient(plant));
});

router.patch("/:id", (req: AuthedRequest, res) => {
  const plant = findOwned(req);
  if (!plant) return res.status(404).json({ error: "Plant not found." });
  const body = req.body ?? {};
  if (body.nickname !== undefined && typeof body.nickname === "string") {
    plant.nickname = body.nickname.trim() || plant.nickname;
  }
  if (body.frequencyDays !== undefined) {
    plant.frequencyDays = clampFrequency(body.frequencyDays, plant.frequencyDays);
    plant.nextDue = addDays(new Date(plant.lastWatered), plant.frequencyDays).toISOString();
  }
  save();
  res.json(toClient(plant));
});

router.delete("/:id", (req: AuthedRequest, res) => {
  const db = getDb();
  const before = db.plants.length;
  db.plants = db.plants.filter(
    (p) => !(p.id === req.params.id && p.userId === req.user!.id)
  );
  if (db.plants.length === before) return res.status(404).json({ error: "Plant not found." });
  save();
  res.json({ ok: true });
});

export default router;
