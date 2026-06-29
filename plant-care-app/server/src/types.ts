// Shared domain types for plant analysis. Kept framework-agnostic so the
// frontend can re-declare an identical shape.

export type Severity = "none" | "low" | "moderate" | "high" | "critical";

export interface AlternativeMatch {
  commonName: string;
  scientificName: string;
  confidence: number; // 0-1
}

export interface Identification {
  commonName: string;
  scientificName: string;
  family: string;
  confidence: number; // 0-1
  description: string;
  alternativeMatches: AlternativeMatch[];
}

export interface HealthIssue {
  type: "disease" | "pest" | "deficiency" | "environmental";
  name: string;
  severity: Severity;
  description: string;
  treatment: string;
}

export interface Health {
  score: number; // 0-100
  status: string; // e.g. "Healthy", "Needs attention"
  summary: string;
  issues: HealthIssue[];
}

export interface WaterPlan {
  frequencyDays: number;
  amount: string;
  method: string;
  notes: string;
  nextWateringDate: string; // ISO date
}

export interface CarePlan {
  light: { requirement: string; placement: string };
  water: WaterPlan;
  soil: { type: string; phRange: string; drainage: string; recommendation: string };
  pot: { assessment: string; recommendedSize: string; material: string; drainage: string };
  repot: { needed: boolean; frequency: string; bestSeason: string; instructions: string };
  fertilizer: { type: string; npk: string; frequency: string; season: string; notes: string };
  temperature: { minC: number; maxC: number; idealC: number };
  humidity: { idealPct: string; tips: string };
}

export interface ClimateFit {
  suitable: boolean;
  rating: "excellent" | "good" | "fair" | "challenging";
  notes: string;
}

export interface ClimateContext {
  latitude: number;
  longitude: number;
  locationName?: string;
  currentTempC?: number;
  humidityPct?: number;
  conditions?: string;
  hardinessHint?: string;
}

export interface PlantAnalysis {
  identification: Identification;
  health: Health;
  care: CarePlan;
  climateFit: ClimateFit;
  growthTips: string[];
  pestPrevention: string[];
  source: "ai" | "demo";
  analyzedAt: string;
  climate?: ClimateContext;
}
