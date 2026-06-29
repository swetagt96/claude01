import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Lightweight JSON-file persistence. Good enough for a single-process demo;
// swap for a real database (Postgres, SQLite, etc.) for production scale.

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "..", "data");
const DATA_FILE = join(DATA_DIR, "db.json");

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

export interface PlantRecord {
  id: string;
  userId: string;
  nickname: string;
  commonName: string;
  scientificName: string;
  imageDataUrl?: string;
  frequencyDays: number;
  lastWatered: string;
  nextDue: string;
  wateringNotes?: string;
  createdAt: string;
  // Day-key of the last push reminder, so the scheduler does not repeat itself.
  lastNotifiedDay?: string;
}

// A stored Web Push subscription (shape defined by the browser Push API).
export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

interface Database {
  users: UserRecord[];
  sessions: SessionRecord[];
  plants: PlantRecord[];
  pushSubscriptions: PushSubscriptionRecord[];
  vapid?: VapidConfig;
}

const empty: Database = {
  users: [],
  sessions: [],
  plants: [],
  pushSubscriptions: [],
};

let db: Database = empty;

function load(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<Database>;
      db = {
        users: parsed.users ?? [],
        sessions: parsed.sessions ?? [],
        plants: parsed.plants ?? [],
        pushSubscriptions: parsed.pushSubscriptions ?? [],
        vapid: parsed.vapid,
      };
    } else {
      db = { ...empty };
      persist();
    }
  } catch (err) {
    console.error("Failed to load data store, starting empty:", err);
    db = { ...empty };
  }
}

function persist(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist data store:", err);
  }
}

load();

// Expose the in-memory database plus a save() that flushes to disk. Callers
// mutate the arrays directly and then call save().
export function getDb(): Database {
  return db;
}

export function save(): void {
  persist();
}
