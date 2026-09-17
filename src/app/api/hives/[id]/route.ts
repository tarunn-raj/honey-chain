import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const hive = await db.hive.findUnique({
    where: { id },
    include: {
      apiary: { include: { cluster: true, beekeeper: { select: { name: true } } } },
      telemetryReadings: { orderBy: { recordedAt: "desc" }, take: 168 },
      healthAlerts: { orderBy: { detectedAt: "desc" }, take: 30 },
    },
  });
  if (!hive) return Response.json({ error: "Hive not found" }, { status: 404 });
  return Response.json({ hive: { ...hive, telemetryReadings: [...hive.telemetryReadings].reverse() } });
}
