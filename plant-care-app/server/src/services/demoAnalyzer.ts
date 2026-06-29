import type { ClimateContext, PlantAnalysis } from "../types.js";

// A small library of well-known plants so the demo mode returns realistic,
// varied, and genuinely useful guidance even without an AI key.
interface DemoPlant {
  commonName: string;
  scientificName: string;
  family: string;
  description: string;
  waterDays: number;
  light: { requirement: string; placement: string };
  soil: { type: string; phRange: string; drainage: string; recommendation: string };
  fertilizer: { type: string; npk: string; frequency: string; season: string; notes: string };
  temperature: { minC: number; maxC: number; idealC: number };
  humidity: { idealPct: string; tips: string };
  repotFrequency: string;
  growthTips: string[];
  commonPests: string[];
}

const PLANTS: DemoPlant[] = [
  {
    commonName: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    family: "Asparagaceae",
    description:
      "A hardy, upright succulent with stiff sword-like leaves. Extremely tolerant of low light and irregular watering, making it one of the easiest houseplants to keep tall and healthy.",
    waterDays: 14,
    light: { requirement: "Low to bright indirect light", placement: "Tolerates a few feet from a window; avoid harsh midday sun." },
    soil: { type: "Free-draining cactus / succulent mix", phRange: "5.5 - 7.5", drainage: "Excellent (sandy, gritty)", recommendation: "Add perlite or coarse sand to prevent water retention and root rot." },
    fertilizer: { type: "Balanced liquid, diluted to half strength", npk: "10-10-10", frequency: "Every 6-8 weeks", season: "Spring and summer only", notes: "Do not feed in winter when growth is dormant." },
    temperature: { minC: 10, maxC: 32, idealC: 22 },
    humidity: { idealPct: "30-50%", tips: "Very forgiving of dry indoor air; no misting needed." },
    repotFrequency: "Every 2-3 years",
    growthTips: [
      "Rotate the pot a quarter turn weekly so leaves grow evenly and tall.",
      "Let soil dry out completely between waterings to encourage strong roots.",
      "Wipe leaves with a damp cloth monthly to maximize light absorption.",
    ],
    commonPests: ["Mealybugs", "Spider mites", "Fungus gnats"],
  },
  {
    commonName: "Monstera",
    scientificName: "Monstera deliciosa",
    family: "Araceae",
    description:
      "A vigorous tropical climber prized for large, glossy, naturally fenestrated (split) leaves. Given support and bright indirect light it grows tall quickly.",
    waterDays: 7,
    light: { requirement: "Bright indirect light", placement: "Near an east or north window; protect from direct sun which scorches leaves." },
    soil: { type: "Rich, chunky aroid mix", phRange: "5.5 - 7.0", drainage: "Good", recommendation: "Mix potting soil with orchid bark, perlite and a little coco coir for aeration." },
    fertilizer: { type: "Balanced liquid fertilizer", npk: "20-20-20", frequency: "Every 3-4 weeks", season: "Spring through early autumn", notes: "Feed lightly; over-fertilizing causes leaf-tip burn." },
    temperature: { minC: 16, maxC: 30, idealC: 24 },
    humidity: { idealPct: "60-80%", tips: "Loves humidity; group plants or use a pebble tray / humidifier for bigger fenestrations." },
    repotFrequency: "Every 1-2 years",
    growthTips: [
      "Provide a moss pole or trellis — it climbs and produces larger, more split leaves.",
      "Wipe leaves and mist regularly to support large leaf development.",
      "Prune the occasional aerial root only if untidy; they help the plant climb.",
    ],
    commonPests: ["Spider mites", "Scale", "Thrips"],
  },
  {
    commonName: "Peace Lily",
    scientificName: "Spathiphyllum wallisii",
    family: "Araceae",
    description:
      "An elegant flowering houseplant with glossy dark leaves and white spathes. A great air-purifier that visibly droops to tell you when it needs water.",
    waterDays: 5,
    light: { requirement: "Low to medium indirect light", placement: "Thrives away from direct sun; tolerates north-facing rooms." },
    soil: { type: "Peat-based, moisture-retentive potting mix", phRange: "5.8 - 6.5", drainage: "Moderate", recommendation: "Keep evenly moist but never waterlogged; add perlite for some drainage." },
    fertilizer: { type: "Balanced houseplant fertilizer", npk: "20-20-20", frequency: "Every 6 weeks", season: "Spring and summer", notes: "Excess fertilizer reduces flowering and browns leaf tips." },
    temperature: { minC: 16, maxC: 29, idealC: 23 },
    humidity: { idealPct: "50-70%", tips: "Mist leaves or use a humidifier; brown tips usually mean dry air or tap-water minerals." },
    repotFrequency: "Every 1-2 years",
    growthTips: [
      "Use filtered or rainwater — peace lilies are sensitive to chlorine and fluoride.",
      "Remove spent flowers and yellow leaves at the base to redirect energy.",
      "If it droops, water promptly; it recovers within hours.",
    ],
    commonPests: ["Aphids", "Mealybugs", "Spider mites"],
  },
  {
    commonName: "Fiddle Leaf Fig",
    scientificName: "Ficus lyrata",
    family: "Moraceae",
    description:
      "A statement tree with large, violin-shaped leaves. With consistent bright light and stable conditions it grows into a tall indoor centerpiece.",
    waterDays: 7,
    light: { requirement: "Bright indirect to some direct light", placement: "Right beside a bright window; acclimate slowly to direct sun." },
    soil: { type: "Well-draining indoor tree mix", phRange: "6.0 - 7.0", drainage: "Good", recommendation: "Use a peat-based mix with perlite; ensure the pot drains freely." },
    fertilizer: { type: "High-nitrogen foliage fertilizer", npk: "3-1-2", frequency: "Monthly", season: "Spring and summer", notes: "Nitrogen supports the big leaves; stop feeding in winter." },
    temperature: { minC: 15, maxC: 29, idealC: 22 },
    humidity: { idealPct: "40-60%", tips: "Avoid drafts and sudden temperature swings, which cause leaf drop." },
    repotFrequency: "Every 1-2 years",
    growthTips: [
      "Keep it in one stable spot — it dislikes being moved.",
      "Dust the large leaves often so they photosynthesize efficiently.",
      "Rotate slightly each week for even, upright growth.",
    ],
    commonPests: ["Spider mites", "Scale", "Mealybugs"],
  },
  {
    commonName: "Pothos",
    scientificName: "Epipremnum aureum",
    family: "Araceae",
    description:
      "A fast-growing trailing vine with heart-shaped leaves. Nearly indestructible and ideal for beginners; trails or climbs readily.",
    waterDays: 7,
    light: { requirement: "Low to bright indirect light", placement: "Adaptable; variegation is stronger in brighter light." },
    soil: { type: "Standard well-draining potting mix", phRange: "6.1 - 6.8", drainage: "Good", recommendation: "Any quality potting mix with added perlite works well." },
    fertilizer: { type: "Balanced liquid fertilizer", npk: "10-10-10", frequency: "Every 4-6 weeks", season: "Spring and summer", notes: "Light feeders; over-fertilizing can cause leggy growth." },
    temperature: { minC: 15, maxC: 30, idealC: 23 },
    humidity: { idealPct: "40-60%", tips: "Tolerates average home humidity; appreciates occasional misting." },
    repotFrequency: "Every 1-2 years",
    growthTips: [
      "Pinch or prune vines to encourage bushier, fuller growth.",
      "Train onto a moss pole for larger leaves and a tall habit.",
      "Propagate trimmings in water to fill out the pot.",
    ],
    commonPests: ["Mealybugs", "Scale", "Spider mites"],
  },
];

// Deterministic pseudo-hash so the same photo size maps to a stable result in demo mode.
function pickPlant(seed: number): DemoPlant {
  return PLANTS[seed % PLANTS.length];
}

function computeClimateFit(
  plant: DemoPlant,
  climate?: ClimateContext
): PlantAnalysis["climateFit"] {
  if (!climate || climate.currentTempC === undefined) {
    return {
      suitable: true,
      rating: "good",
      notes:
        "No live climate data available. As an indoor plant, keep it within its ideal temperature range and away from cold drafts and heating vents.",
    };
  }

  const t = climate.currentTempC;
  const { minC, maxC, idealC } = plant.temperature;
  const place = climate.locationName ? `In ${climate.locationName}, ` : "";

  if (t < minC) {
    return {
      suitable: false,
      rating: "challenging",
      notes: `${place}the current ${t}°C is below this plant's minimum of ${minC}°C. Keep it indoors, away from cold windows, and aim for ~${idealC}°C.`,
    };
  }
  if (t > maxC) {
    return {
      suitable: true,
      rating: "fair",
      notes: `${place}the current ${t}°C is above the comfortable maximum of ${maxC}°C. Provide shade, increase airflow, and water more frequently to prevent heat stress.`,
    };
  }
  const closeness = Math.abs(t - idealC);
  return {
    suitable: true,
    rating: closeness <= 4 ? "excellent" : "good",
    notes: `${place}the current ${t}°C sits within the ideal ${minC}-${maxC}°C range — great conditions for steady growth.`,
  };
}

export function buildDemoAnalysis(
  imageByteLength: number,
  climate?: ClimateContext
): PlantAnalysis {
  const plant = pickPlant(imageByteLength);

  // Adjust watering frequency slightly for warm climates (plants drink more).
  let waterDays = plant.waterDays;
  if (climate?.currentTempC !== undefined && climate.currentTempC >= 28) {
    waterDays = Math.max(2, waterDays - 2);
  } else if (climate?.currentTempC !== undefined && climate.currentTempC <= 10) {
    waterDays = waterDays + 3;
  }

  const next = new Date();
  next.setDate(next.getDate() + waterDays);

  return {
    source: "demo",
    analyzedAt: new Date().toISOString(),
    climate,
    identification: {
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      family: plant.family,
      confidence: 0.82,
      description: plant.description,
      alternativeMatches: PLANTS.filter((p) => p.commonName !== plant.commonName)
        .slice(0, 2)
        .map((p, i) => ({
          commonName: p.commonName,
          scientificName: p.scientificName,
          confidence: 0.12 - i * 0.04,
        })),
    },
    health: {
      score: 86,
      status: "Healthy",
      summary:
        "The plant appears generally healthy. Leaves look firm with good color. Keep monitoring for early signs of pests and follow the care plan below to keep it growing tall and strong.",
      issues: [
        {
          type: "environmental",
          name: "Preventive watch",
          severity: "low",
          description:
            "No active disease detected from the photo, but indoor plants are prone to overwatering and dry-air stress.",
          treatment:
            "Check soil moisture before watering and maintain the recommended humidity to prevent issues before they start.",
        },
      ],
    },
    care: {
      light: plant.light,
      water: {
        frequencyDays: waterDays,
        amount: "Water thoroughly until it drains from the bottom, then empty the saucer.",
        method: "Bottom-water or pour evenly over the soil; avoid wetting the crown.",
        notes: `Let the top 2-3 cm of soil dry between waterings. ${
          climate?.currentTempC !== undefined && climate.currentTempC >= 28
            ? "Frequency increased due to warm local weather."
            : climate?.currentTempC !== undefined && climate.currentTempC <= 10
            ? "Frequency reduced due to cool local weather and slower growth."
            : "Adjust with the seasons — less in winter."
        }`,
        nextWateringDate: next.toISOString(),
      },
      soil: plant.soil,
      pot: {
        assessment:
          "Choose a pot only 2-3 cm wider than the root ball. Oversized pots hold excess moisture and risk root rot.",
        recommendedSize: "2-3 cm larger in diameter than the current root ball",
        material: "Terracotta for better breathability, or glazed/plastic if you tend to underwater.",
        drainage: "Essential — the pot must have drainage holes.",
      },
      repot: {
        needed: false,
        frequency: plant.repotFrequency,
        bestSeason: "Early spring, at the start of the growing season",
        instructions:
          "Repot when roots circle the bottom or poke through drainage holes. Loosen the root ball, refresh with new mix, and water lightly after repotting.",
      },
      fertilizer: plant.fertilizer,
      temperature: plant.temperature,
      humidity: plant.humidity,
    },
    climateFit: computeClimateFit(plant, climate),
    growthTips: plant.growthTips,
    pestPrevention: [
      `Inspect both sides of leaves weekly for early signs of ${plant.commonPests
        .slice(0, 2)
        .join(" and ")}.`,
      "Quarantine new plants for two weeks before placing them near others.",
      "Wipe leaves and keep them dust-free to deter mites and improve health.",
      "If pests appear, treat early with insecticidal soap or neem oil and isolate the plant.",
      "Avoid overwatering — soggy soil attracts fungus gnats and encourages root rot.",
    ],
  };
}
