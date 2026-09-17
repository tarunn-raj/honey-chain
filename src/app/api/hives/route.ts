import { db } from "@/lib/db";

export async function GET() {
  const hives = await db.hive.findMany({
    orderBy: { code: "asc" },
    include: {
      apiary: { select: { name: true } },
      telemetryReadings: { orderBy: { recordedAt: "desc" }, take: 1 },
      healthAlerts: { where: { resolvedAt: null }, orderBy: { detectedAt: "desc" }, take: 3 },
    },
  });
  return Response.json({ hives: hives.map((hive) => ({ id: hive.id, code: hive.code, status: hive.status, apiary: hive.apiary.name, latest: hive.telemetryReadings[0] ?? null, alerts: hive.healthAlerts })) });
}
