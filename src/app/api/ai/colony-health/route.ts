import { predictColonyHealth } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json() as { readings?: Array<Record<string, unknown>> };
  const result = await predictColonyHealth(body.readings ?? []);
  return Response.json({ ...result.data, source: result.available ? "ai" : "fallback", aiAvailable: result.available });
}
