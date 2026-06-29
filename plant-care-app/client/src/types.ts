// Mirror of the server's analysis types so the UI is fully typed.

export type Severity = "none" | "low" | "moderate" | "high" | "critical";

export interface AlternativeMatch {
  commonName: string;
  scientificName: string;
  confidence: number;
}

export interface Identification {
  commonName: string;
  scientificName: string;
  family: string;
  confidence: number;
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
  score: number;
  status: string;
  summary: string;
  issues: HealthIssue[];
}

export interface WaterPlan {
  frequencyDays: number;
  amount: string;
  method: string;
  notes: string;
  nextWateringDate: string;
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


// A plant the user has saved to their garden for ongoing watering reminders.
export interface SavedPlant {
  id: string;
  nickname: string;
  commonName: string;
  scientificName: string;
  imageDataUrl?: string; // small thumbnail stored in localStorage
  frequencyDays: number;
  lastWatered: string; // ISO timestamp
  nextDue: string; // ISO timestamp
  wateringNotes?: string;
  createdAt: string; // ISO timestamp
}

export type DueState = "overdue" | "due-today" | "soon" | "upcoming";

export interface DueStatus {
  state: DueState;
  days: number; // days until due (negative if overdue)
  label: string;
}
