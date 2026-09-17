import { z } from "zod";
import { db } from "@/lib/db";
import { appendBlock } from "@/lib/ledger";
import { roleForRequest } from "@/lib/auth";

const schema = z.object({ type: z.enum(["PROCESSED", "BOTTLED"]), outputUnits: z.number().int().positive(), notes: z.string().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = schema.parse(await request.json());
    if (roleForRequest(request.headers.get("cookie"), "PROCESSOR") !== "PROCESSOR") return Response.json({ error: "Only processors can process batches" }, { status: 403 });
    const batch = await db.harvestBatch.findUniqueOrThrow({ where: { id } });
    if (batch.status !== "LAB_TESTING" && batch.status !== "PROCESSING") return Response.json({ error: "Batch is not ready for processing" }, { status: 409 });
    const actor = await db.user.findFirstOrThrow({ where: { role: "PROCESSOR" } });
    const event = await db.processingEvent.create({ data: { batchId: id, processorId: actor.id, type: data.type === "PROCESSED" ? "FILTERED" : "BOTTLED", at: new Date(), outputUnits: data.outputUnits, notes: data.notes } });
    const status = data.type === "BOTTLED" ? "BOTTLED" : "PROCESSING";
    const updated = await db.harvestBatch.update({ where: { id }, data: { status } });
    const block = await appendBlock({ batchId: id, eventType: data.type, actorId: actor.id, payload: data });
    return Response.json({ batch: updated, event, blockHash: block.hash });
  } catch (error) { return Response.json({ error: error instanceof z.ZodError ? error.issues : "Unable to process batch" }, { status: 400 }); }
}