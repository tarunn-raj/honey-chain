import { z } from "zod";
import { db } from "@/lib/db";

const readingSchema = z.object({
  recordedAt: z.coerce.date(),
  tempC: z.number().finite().min(-20).max(70),
  humidity: z.number().finite().min(0).max(100),
  weightKg: z.number().finite().min(0).max(500),
  soundHz: z.number().finite().min(0).max(20000),
  soundDb: z.number().finite().min(0).max(140),
  co2Ppm: z.number().finite().min(0).max(50000),
  batteryPct: z.number().finite().min(0).max(100),
});

const telemetrySchema = z.object({
  hiveCode: z.string().regex(/^HIVE-[A-Z0-9-]+$/),
  deviceKey: z.string().min(1),
  readings: z.array(readingSchema).min(1).max(1000),
});

const alertRules = [
  { type: "THERMAL_STRESS", severity: "HIGH", note: "Brood-season temperature outside 32-38°C." },
  { type: "MOISTURE_RISK", severity: "MEDIUM", note: "Humidity remained above 75% for approximately six hours." },
  { type: "THEFT", severity: "CRITICAL", note: "Hive weight dropped by more than 2 kg within approximately one hour." },
  { type: "QUEENLESS", severity: "HIGH", note: "Sustained high acoustic energy with missing 220-280 Hz signature." },
  { type: "VENTILATION_FAILURE", severity: "CRITICAL", note: "CO2 exceeded 5000 ppm." },
] as const;

type AlertRule = (typeof alertRules)[number];

function inBroodSeason(date: Date) {
  const month = date.getUTCMonth() + 1;
  return month >= 2 && month <= 10;
}

function sustainedHumidity(readings: { recordedAt: Date; humidity: number }[]) {
  const high = readings.filter((reading) => reading.humidity > 75).sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  if (high.length < 2) return false;
  return high[high.length - 1].recordedAt.getTime() - high[0].recordedAt.getTime() >= 5.5 * 60 * 60 * 1000;
}

function weightDrop(readings: { recordedAt: Date; weightKg: number }[]) {
  const sorted = [...readings].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  return sorted.some((current, index) => sorted.slice(0, index).some((previous) => current.recordedAt.getTime() - previous.recordedAt.getTime() <= 60 * 60 * 1000 && previous.weightKg - current.weightKg > 2));
}

function queenless(readings: { soundHz: number; soundDb: number }[]) {
  if (readings.length < 3) return false;
  const recent = readings.slice(-6);
  return recent.every((reading) => reading.soundDb >= 55 && (reading.soundHz < 220 || reading.soundHz > 280));
}

async function createAlertIfNeeded(hiveId: string, rule: AlertRule, detectedAt: Date) {
  const existing = await db.healthAlert.findFirst({ where: { hiveId, type: rule.type, resolvedAt: null } });
  if (existing) return null;
  return db.healthAlert.create({ data: { hiveId, type: rule.type, severity: rule.severity, confidence: 0.9, detectedAt, notes: rule.note } });
}

export async function POST(request: Request) {
  try {
    const input = telemetrySchema.parse(await request.json());
    if (!process.env.IOT_DEVICE_KEY || input.deviceKey !== process.env.IOT_DEVICE_KEY) {
      return Response.json({ error: "Invalid device key" }, { status: 401 });
    }

    const hive = await db.hive.findUnique({ where: { code: input.hiveCode } });
    if (!hive) return Response.json({ error: "Unknown hive code" }, { status: 404 });

    const readings = input.readings.map((reading) => ({ ...reading, hiveId: hive.id }));
    for (const reading of readings) {
      await db.telemetryReading.upsert({
        where: { hiveId_recordedAt: { hiveId: hive.id, recordedAt: reading.recordedAt } },
        create: reading,
        update: reading,
      });
    }

    const recent = await db.telemetryReading.findMany({ where: { hiveId: hive.id, recordedAt: { gte: new Date(Math.min(...readings.map((reading) => reading.recordedAt.getTime())) - 6 * 60 * 60 * 1000) } }, orderBy: { recordedAt: "asc" }, take: 500 });
    const latest = readings.reduce((a, b) => a.recordedAt > b.recordedAt ? a : b);
    const triggered: AlertRule[] = [];
    if (inBroodSeason(latest.recordedAt) && (latest.tempC > 38 || latest.tempC < 32)) triggered.push(alertRules[0]);
    if (sustainedHumidity(recent)) triggered.push(alertRules[1]);
    if (weightDrop(recent)) triggered.push(alertRules[2]);
    if (queenless(recent)) triggered.push(alertRules[3]);
    if (latest.co2Ppm > 5000) triggered.push(alertRules[4]);

    const alerts = (await Promise.all(triggered.map((rule) => createAlertIfNeeded(hive.id, rule, latest.recordedAt)))).filter(Boolean);
    return Response.json({ acceptedCount: readings.length, rejectedCount: 0, hive: { id: hive.id, code: hive.code }, alertsCreated: alerts.length, alerts });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid telemetry payload", details: error.issues }, { status: 400 });
    return Response.json({ error: "Unable to store telemetry" }, { status: 500 });
  }
}