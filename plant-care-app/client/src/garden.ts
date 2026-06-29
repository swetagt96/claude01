import type { DueStatus, SavedPlant } from "./types";

const STORAGE_KEY = "plantpal.garden.v1";

function read(): SavedPlant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedPlant[]) : [];
  } catch {
    return [];
  }
}

function write(plants: SavedPlant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  } catch (err) {
    // Most likely a quota error from large thumbnails.
    console.error("Could not save garden to localStorage:", err);
  }
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function loadGarden(): SavedPlant[] {
  return read().sort(
    (a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime()
  );
}

export interface NewPlantInput {
  nickname: string;
  commonName: string;
  scientificName: string;
  frequencyDays: number;
  imageDataUrl?: string;
  wateringNotes?: string;
}

export function addPlant(input: NewPlantInput): SavedPlant[] {
  const now = new Date();
  const plant: SavedPlant = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    nickname: input.nickname.trim() || input.commonName,
    commonName: input.commonName,
    scientificName: input.scientificName,
    imageDataUrl: input.imageDataUrl,
    frequencyDays: Math.max(1, Math.round(input.frequencyDays || 7)),
    lastWatered: now.toISOString(),
    nextDue: addDays(now, Math.max(1, Math.round(input.frequencyDays || 7))).toISOString(),
    wateringNotes: input.wateringNotes,
    createdAt: now.toISOString(),
  };
  const plants = [...read(), plant];
  write(plants);
  return loadGarden();
}

export function waterPlant(id: string): SavedPlant[] {
  const now = new Date();
  const plants = read().map((p) =>
    p.id === id
      ? {
          ...p,
          lastWatered: now.toISOString(),
          nextDue: addDays(now, p.frequencyDays).toISOString(),
        }
      : p
  );
  write(plants);
  return loadGarden();
}

export function removePlant(id: string): SavedPlant[] {
  const plants = read().filter((p) => p.id !== id);
  write(plants);
  return loadGarden();
}

export function updateFrequency(id: string, frequencyDays: number): SavedPlant[] {
  const freq = Math.max(1, Math.round(frequencyDays));
  const plants = read().map((p) =>
    p.id === id
      ? {
          ...p,
          frequencyDays: freq,
          nextDue: addDays(new Date(p.lastWatered), freq).toISOString(),
        }
      : p
  );
  write(plants);
  return loadGarden();
}

// Whole-day difference between two dates (ignoring time of day).
function dayDiff(target: Date, base: Date): number {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((t.getTime() - b.getTime()) / 86_400_000);
}

export function getDueStatus(plant: SavedPlant, now: Date = new Date()): DueStatus {
  const days = dayDiff(new Date(plant.nextDue), now);
  if (days < 0) {
    return {
      state: "overdue",
      days,
      label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
    };
  }
  if (days === 0) return { state: "due-today", days, label: "Water today" };
  if (days <= 2)
    return { state: "soon", days, label: `Due in ${days} day${days === 1 ? "" : "s"}` };
  return { state: "upcoming", days, label: `Due in ${days} days` };
}

export function isActionable(plant: SavedPlant, now: Date = new Date()): boolean {
  const s = getDueStatus(plant, now).state;
  return s === "overdue" || s === "due-today";
}
