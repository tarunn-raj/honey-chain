import { restoreDemoChain } from "@/lib/ledger";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { batchId?: unknown };
    if (typeof body.batchId !== "string") return Response.json({ error: "batchId is required" }, { status: 400 });
    const verification = await restoreDemoChain(body.batchId);
    return Response.json({ ok: true, verification });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to restore chain" }, { status: 404 });
  }
}