import type { SavedPlant } from "./types";
import { authHeaders, isLoggedIn } from "./auth";
import {
  addPlant as localAdd,
  loadGarden as localLoad,
  removePlant as localRemove,
  waterPlant as localWater,
  type NewPlantInput,
} from "./garden";

export type { NewPlantInput };

const STORAGE_KEY = "plantpal.garden.v1";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed.");
  }
  return res.json() as Promise<T>;
}

export async function listGarden(): Promise<SavedPlant[]> {
  if (!isLoggedIn()) return localLoad();
  return api<SavedPlant[]>("/api/plants");
}

export async function addToGarden(input: NewPlantInput): Promise<SavedPlant[]> {
  if (!isLoggedIn()) return localAdd(input);
  await api("/api/plants", { method: "POST", body: JSON.stringify(input) });
  return listGarden();
}

export async function waterInGarden(id: string): Promise<SavedPlant[]> {
  if (!isLoggedIn()) return localWater(id);
  await api(`/api/plants/${id}/water`, { method: "POST" });
  return listGarden();
}

export async function removeFromGarden(id: string): Promise<SavedPlant[]> {
  if (!isLoggedIn()) return localRemove(id);
  await api(`/api/plants/${id}`, { method: "DELETE" });
  return listGarden();
}

// When a user signs in, upload any plants they created while logged out, then
// clear the local copy so the backend becomes the single source of truth.
export async function migrateLocalToRemote(): Promise<void> {
  if (!isLoggedIn()) return;
  const local = localLoad();
  if (local.length === 0) return;
  for (const p of local) {
    try {
      await api("/api/plants", {
        method: "POST",
        body: JSON.stringify({
          nickname: p.nickname,
          commonName: p.commonName,
          scientificName: p.scientificName,
          frequencyDays: p.frequencyDays,
          imageDataUrl: p.imageDataUrl,
          wateringNotes: p.wateringNotes,
        }),
      });
    } catch {
      /* skip individual failures */
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
