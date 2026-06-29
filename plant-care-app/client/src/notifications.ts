import type { SavedPlant } from "./types";
import { getDueStatus } from "./garden";

const NOTIFIED_KEY = "plantpal.notified.v1";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// Track which plants were already notified on which day so we don't spam the
// user with repeated reminders for the same due date.
function loadNotified(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveNotified(map: Record<string, string>): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Fires a notification for each plant that is due today or overdue, at most once
 * per plant per day. Returns the number of notifications shown.
 */
export function notifyDuePlants(plants: SavedPlant[]): number {
  if (!notificationsSupported() || Notification.permission !== "granted") return 0;

  const notified = loadNotified();
  const today = todayKey();
  let shown = 0;

  for (const plant of plants) {
    const status = getDueStatus(plant);
    if (status.state !== "overdue" && status.state !== "due-today") continue;

    const stamp = `${today}`;
    if (notified[plant.id] === stamp) continue; // already reminded today

    try {
      new Notification("🌿 Time to water your plant", {
        body: `${plant.nickname} (${plant.commonName}) — ${status.label.toLowerCase()}.`,
        tag: `plantpal-${plant.id}`,
        icon:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌿</text></svg>'
          ),
      });
      notified[plant.id] = stamp;
      shown++;
    } catch {
      /* ignore */
    }
  }

  saveNotified(notified);
  return shown;
}
