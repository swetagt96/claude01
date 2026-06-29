import type { ClimateContext, PlantAnalysis } from "./types";

export interface LatLon {
  latitude: number;
  longitude: number;
}

export async function fetchClimate(loc: LatLon): Promise<ClimateContext> {
  const res = await fetch(`/api/climate?lat=${loc.latitude}&lon=${loc.longitude}`);
  if (!res.ok) throw new Error("Could not fetch local climate");
  return res.json();
}

export async function analyzePhoto(
  file: File,
  loc?: LatLon
): Promise<PlantAnalysis> {
  const form = new FormData();
  form.append("photo", file);
  if (loc) {
    form.append("lat", String(loc.latitude));
    form.append("lon", String(loc.longitude));
  }

  const res = await fetch("/api/analyze", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Analysis failed. Please try again.");
  }
  return res.json();
}
