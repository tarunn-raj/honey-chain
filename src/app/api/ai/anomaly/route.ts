import { detectAnomaly } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json() as { hiveId: string; readings: Array<Record<string, unknown>> };
  const result = await detectAnomaly(body.hiveId, body.readings ?? []);
  return Response.json({ ...result.data, source: result.available ? "ai" : "fallback", aiAvailable: result.available });
}
