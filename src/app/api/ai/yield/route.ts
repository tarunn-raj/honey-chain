import { predictYield } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json() as { hiveId: string; last30DaysReadings: Array<Record<string, unknown>>; floralSource: string; month: number; lat: number; lng: number };
  const result = await predictYield(body);
  return Response.json({ ...result.data, source: result.available ? "ai" : "fallback", aiAvailable: result.available });
}
