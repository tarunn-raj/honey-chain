import { predictDisease } from "@/lib/ai";

export async function POST(request: Request) {
  const result = await predictDisease(await request.formData());
  return Response.json({ ...result.data, source: result.available ? "ai" : "fallback", aiAvailable: result.available });
}
