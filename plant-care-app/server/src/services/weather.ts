import type { ClimateContext } from "../types.js";

// Uses Open-Meteo (free, no API key) to fetch current conditions for a location.
// Docs: https://open-meteo.com/en/docs

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
  timezone?: string;
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
};

function hardinessHint(tempC: number | undefined): string {
  if (tempC === undefined) return "Unknown";
  if (tempC >= 25) return "Warm climate";
  if (tempC >= 15) return "Mild / temperate";
  if (tempC >= 5) return "Cool climate";
  return "Cold climate";
}

export async function getClimateContext(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<ClimateContext> {
  const base: ClimateContext = { latitude, longitude, locationName };

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return base;

    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current ?? {};
    const tempC = current.temperature_2m;

    return {
      ...base,
      currentTempC: tempC,
      humidityPct: current.relative_humidity_2m,
      conditions:
        current.weather_code !== undefined
          ? WEATHER_CODE_MAP[current.weather_code] ?? "Unknown conditions"
          : undefined,
      hardinessHint: hardinessHint(tempC),
    };
  } catch {
    // Network/timeout failures should not break analysis.
    return base;
  }
}
