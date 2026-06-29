import webpush from "web-push";
import { getDb, save, type PlantRecord, type VapidConfig } from "../store.js";

let configured = false;

function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Ensures VAPID keys exist (from env or generated + persisted) and configures web-push.
export function ensureVapid(): VapidConfig {
  const db = getDb();
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@plantpal.example";

  let vapid = db.vapid;
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;

  if (envPub && envPriv) {
    vapid = { publicKey: envPub, privateKey: envPriv, subject };
  } else if (!vapid) {
    const generated = webpush.generateVAPIDKeys();
    vapid = { publicKey: generated.publicKey, privateKey: generated.privateKey, subject };
    db.vapid = vapid;
    save();
    console.log("🔑 Generated new VAPID keys and saved them to the data store.");
  }

  if (!configured) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    configured = true;
  }
  return vapid;
}

export function getPublicKey(): string {
  return ensureVapid().publicKey;
}

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  ensureVapid();
  const db = getDb();
  const subs = db.pushSubscriptions.filter((s) => s.userId === userId);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the subscription is gone — drop it.
        if (status === 404 || status === 410) dead.push(sub.id);
        else console.error("Push send error:", status ?? err);
      }
    })
  );

  if (dead.length) {
    db.pushSubscriptions = db.pushSubscriptions.filter((s) => !dead.includes(s.id));
    save();
  }
}

function isDue(plant: PlantRecord, now: Date): boolean {
  return new Date(plant.nextDue).getTime() <= now.getTime();
}

// Checks all plants and sends a push to owners of those that are due, at most
// once per plant per day.
export async function runDueCheck(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const today = dayKey(now);
  let sent = 0;
  let mutated = false;

  // Group due plants by user to send concise reminders.
  for (const plant of db.plants) {
    if (!isDue(plant, now)) continue;
    if (plant.lastNotifiedDay === today) continue;

    await sendToUser(plant.userId, {
      title: "🌿 Time to water your plant",
      body: `${plant.nickname} (${plant.commonName}) needs watering.`,
      tag: `plantpal-${plant.id}`,
      url: "/",
    });
    plant.lastNotifiedDay = today;
    mutated = true;
    sent++;
  }

  if (mutated) save();
  return sent;
}

let timer: ReturnType<typeof setInterval> | undefined;

export function startScheduler(intervalMs = 15 * 60 * 1000): void {
  ensureVapid();
  // Run shortly after startup, then on an interval.
  setTimeout(() => {
    runDueCheck().catch((e) => console.error("Due check failed:", e));
  }, 5000);
  timer = setInterval(() => {
    runDueCheck().catch((e) => console.error("Due check failed:", e));
  }, intervalMs);
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer);
}
