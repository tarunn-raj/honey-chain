import { tamperBlock } from "@/lib/ledger";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { batchId?: unknown; blockIndex?: unknown; newQuantityKg?: unknown };
    if (typeof body.batchId !== "string" || !Number.isInteger(body.blockIndex) || typeof body.newQuantityKg !== "number") {
      return Response.json({ error: "batchId, integer blockIndex, and numeric newQuantityKg are required" }, { status: 400 });
    }
    const block = await tamperBlock(body.batchId, body.blockIndex as number, body.newQuantityKg);
    return Response.json({ ok: true, blockId: block.id, message: "Demo tamper applied without recomputing the hash." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to tamper with block" }, { status: 404 });
  }
}