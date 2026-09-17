import { createHash } from "node:crypto";

type AIResult<T> = { data: T; available: boolean; error?: string };

export type DiseaseResult = {
  label: string;
  confidence: number;
  all_scores: Record<string, number>;
  recommendation: string;
  urgency: string;
};

export type ColonyHealthResult = {
  queenRightProbability: number;
  agitationIndex: number;
  swarmRiskPct: number;
  foragingScore: number;
  overallHealth: number;
  factors: string[];
};

export type YieldResult = {
  predictedKg: number;
  confidenceInterval: [number, number];
  daysToHarvest: number;
  drivers: { feature: string; impact: number }[];
};

export type AnomalyResult = {
  hiveId: string;
  anomalies: { timestamp: string; reasons: string[] }[];
  anomalyCount: number;
  model: string;
};

const serviceUrl = () => process.env.AI_SERVICE_URL?.replace(/\/$/, "");

async function requestAI<T>(path: string, init: RequestInit, fallback: T): Promise<AIResult<T>> {
  const url = serviceUrl();
  if (!url) return { data: fallback, available: false, error: "AI_SERVICE_URL is not configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url}${path}`, { ...init, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    const data = await response.json() as T;
    return { data, available: true };
  } catch (error) {
    return { data: fallback, available: false, error: error instanceof Error ? error.message : "AI service unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

export function fallbackDisease(seed = "demo"): DiseaseResult {
  const hash = createHash("sha256").update(seed).digest("hex");
  const healthy = 0.62 + parseInt(hash.slice(0, 2), 16) / 2550;
  return { label: "HEALTHY", confidence: Number(healthy.toFixed(4)), all_scores: { HEALTHY: Number(healthy.toFixed(4)), VARROA_MITE: 0.14, AMERICAN_FOULBROOD: 0.1, CHALKBROOD: 0.1 }, recommendation: "Continue routine inspections, nutrition checks, and Varroa monitoring.", urgency: "low" };
}

export function fallbackColonyHealth(readings: Array<Record<string, unknown>>): ColonyHealthResult {
  const weights = readings.map((reading) => Number(reading.weightKg) || 0);
  const dbValues = readings.map((reading) => Number(reading.soundDb) || 0);
  const sound = readings.map((reading) => Number(reading.soundHz) || 0);
  const averageDb = dbValues.length ? dbValues.reduce((sum, value) => sum + value, 0) / dbValues.length : 48;
  const queenBand = sound.filter((value) => value >= 220 && value <= 280).length / Math.max(1, sound.length);
  const trend = weights.length > 1 ? (weights[weights.length - 1] - weights[0]) / weights.length : 0;
  const agitation = Math.min(100, Math.max(0, (averageDb - 40) * 2));
  const queen = Math.min(0.99, Math.max(0.05, 0.45 + queenBand * 0.45 - Math.max(0, averageDb - 62) / 100));
  const foraging = Math.min(100, Math.max(0, 55 + trend * 20));
  const swarm = Math.min(100, Math.max(0, agitation * 0.55 + Math.max(0, trend) * 10));
  const overall = Math.min(100, Math.max(0, queen * 55 + (100 - agitation) * 0.2 + foraging * 0.25));
  return { queenRightProbability: Number(queen.toFixed(4)), agitationIndex: Number(agitation.toFixed(2)), swarmRiskPct: Number(swarm.toFixed(2)), foragingScore: Number(foraging.toFixed(2)), overallHealth: Number(overall.toFixed(2)), factors: queen < 0.55 ? ["Weak 220-280 Hz queen-presence signature"] : ["No major fallback risk factor detected"] };
}

export function fallbackYield(readings: Array<Record<string, unknown>>, floralSource = "MULTIFLORA"): YieldResult {
  const weights = readings.map((reading) => Number(reading.weightKg) || 0);
  const current = weights.at(-1) || 25;
  const trend = weights.length > 1 ? (current - weights[0]) / weights.length : 0;
  const sourceBonus = { MUSTARD: 1.2, LITCHI: 1.5, EUCALYPTUS: 1, JAMUN: 1.3, MULTIFLORA: 1.1 }[floralSource as "MUSTARD"] ?? 0.8;
  const predicted = Math.max(0.5, current * 0.16 + trend * 4 + sourceBonus);
  return { predictedKg: Number(predicted.toFixed(2)), confidenceInterval: [Number((predicted * 0.78).toFixed(2)), Number((predicted * 1.22).toFixed(2))], daysToHarvest: Math.max(1, Math.round(14 - trend * 2)), drivers: [{ feature: "current weight", impact: Number((current * 0.16).toFixed(2)) }, { feature: "weight trend", impact: Number((trend * 4).toFixed(2)) }, { feature: "floral source", impact: sourceBonus }] };
}

export function fallbackAnomaly(hiveId: string, readings: Array<Record<string, unknown>>): AnomalyResult {
  const anomalies = readings.flatMap((reading) => {
    const reasons = [];
    const temperature = Number(reading.tempC) || 0;
    const humidity = Number(reading.humidity) || 0;
    const soundDb = Number(reading.soundDb) || 0;
    if (temperature > 38 || temperature < 32) reasons.push("thermal excursion");
    if (humidity > 80) reasons.push("high humidity");
    if (soundDb > 70) reasons.push("acoustic spike");
    return reasons.length ? [{ timestamp: String(reading.recordedAt ?? new Date().toISOString()), reasons }] : [];
  });
  return { hiveId, anomalies, anomalyCount: anomalies.length, model: "rule-fallback" };
}

export function predictDisease(form: FormData): Promise<AIResult<DiseaseResult>> {
  return requestAI("/predict/disease", { method: "POST", body: form }, fallbackDisease("uploaded-frame"));
}

export function predictColonyHealth(readings: Array<Record<string, unknown>>): Promise<AIResult<ColonyHealthResult>> {
  return requestAI("/predict/colony-health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readings }) }, fallbackColonyHealth(readings));
}

export function predictYield(input: { hiveId: string; last30DaysReadings: Array<Record<string, unknown>>; floralSource: string; month: number; lat: number; lng: number }): Promise<AIResult<YieldResult>> {
  return requestAI("/predict/yield", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, fallbackYield(input.last30DaysReadings, input.floralSource));
}

export function detectAnomaly(hiveId: string, readings: Array<Record<string, unknown>>): Promise<AIResult<AnomalyResult>> {
  return requestAI("/detect/anomaly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hiveId, readings }) }, fallbackAnomaly(hiveId, readings));
}
