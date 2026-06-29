import type { ClimateContext, PlantAnalysis } from "../types.js";
import { buildDemoAnalysis } from "./demoAnalyzer.js";

// Calls an OpenAI-compatible vision model to analyze the plant photo.
// Falls back to the demo analyzer when no key is configured or the call fails.

const SYSTEM_PROMPT = `You are an expert botanist and horticulturist. You analyze a photo of a plant and return a thorough, accurate care assessment.
Always respond with a SINGLE valid JSON object and nothing else (no markdown, no code fences).
The JSON MUST match this TypeScript shape exactly:
{
  "identification": { "commonName": string, "scientificName": string, "family": string, "confidence": number (0-1), "description": string, "alternativeMatches": [{ "commonName": string, "scientificName": string, "confidence": number }] },
  "health": { "score": number (0-100), "status": string, "summary": string, "issues": [{ "type": "disease"|"pest"|"deficiency"|"environmental", "name": string, "severity": "none"|"low"|"moderate"|"high"|"critical", "description": string, "treatment": string }] },
  "care": {
    "light": { "requirement": string, "placement": string },
    "water": { "frequencyDays": number, "amount": string, "method": string, "notes": string, "nextWateringDate": string (ISO date) },
    "soil": { "type": string, "phRange": string, "drainage": string, "recommendation": string },
    "pot": { "assessment": string, "recommendedSize": string, "material": string, "drainage": string },
    "repot": { "needed": boolean, "frequency": string, "bestSeason": string, "instructions": string },
    "fertilizer": { "type": string, "npk": string, "frequency": string, "season": string, "notes": string },
    "temperature": { "minC": number, "maxC": number, "idealC": number },
    "humidity": { "idealPct": string, "tips": string }
  },
  "climateFit": { "suitable": boolean, "rating": "excellent"|"good"|"fair"|"challenging", "notes": string },
  "growthTips": [string],
  "pestPrevention": [string]
}
Carefully inspect the photo for diseases, pests, nutrient deficiencies, and environmental stress. Tailor watering, soil, pot, repotting, fertilizer, light, temperature and humidity advice to the identified species and the provided local climate. Be specific and practical so the plant can grow tall and healthy.`;

function buildUserPrompt(climate?: ClimateContext): string {
  if (!climate) {
    return "Analyze this plant photo. No location/climate data was provided; give general indoor guidance.";
  }
  const parts = [
    `Analyze this plant photo and tailor advice to the user's local climate.`,
    `Location: ${climate.locationName ?? `${climate.latitude}, ${climate.longitude}`}.`,
  ];
  if (climate.currentTempC !== undefined) parts.push(`Current temperature: ${climate.currentTempC}°C.`);
  if (climate.humidityPct !== undefined) parts.push(`Current humidity: ${climate.humidityPct}%.`);
  if (climate.conditions) parts.push(`Conditions: ${climate.conditions}.`);
  if (climate.hardinessHint) parts.push(`Climate type: ${climate.hardinessHint}.`);
  return parts.join(" ");
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  // Strip code fences if the model added them despite instructions.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  // Fall back to the first {...} block if there is leading/trailing prose.
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonStr = start >= 0 && end >= 0 ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(jsonStr);
}

export async function analyzePlant(
  imageBuffer: Buffer,
  mimeType: string,
  climate?: ClimateContext
): Promise<PlantAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  // No key -> demo mode.
  if (!apiKey) {
    return buildDemoAnalysis(imageBuffer.length, climate);
  }

  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: buildUserPrompt(climate) },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`AI request failed (${res.status}): ${errText.slice(0, 300)}`);
      return buildDemoAnalysis(imageBuffer.length, climate);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return buildDemoAnalysis(imageBuffer.length, climate);

    const parsed = extractJson(content) as Partial<PlantAnalysis>;

    // Ensure a sensible nextWateringDate even if the model omitted/garbled it.
    const freq = parsed.care?.water?.frequencyDays ?? 7;
    if (parsed.care?.water) {
      const valid =
        parsed.care.water.nextWateringDate &&
        !Number.isNaN(Date.parse(parsed.care.water.nextWateringDate));
      if (!valid) {
        const next = new Date();
        next.setDate(next.getDate() + freq);
        parsed.care.water.nextWateringDate = next.toISOString();
      }
    }

    return {
      ...(parsed as PlantAnalysis),
      source: "ai",
      analyzedAt: new Date().toISOString(),
      climate,
    };
  } catch (err) {
    console.error("AI analysis error, falling back to demo:", err);
    return buildDemoAnalysis(imageBuffer.length, climate);
  }
}
