import { z } from "zod";
import { db } from "@/lib/db";
import { appendBlock } from "@/lib/ledger";
import { roleForRequest } from "@/lib/auth";

const schema = z.object({ centerName: z.string().min(2), receivedQuantityKg: z.number().positive(), notes: z.string().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = schema.parse(await request.json());
    if (roleForRequest(request.headers.get("cookie"), "COLLECTION_CENTER") !== "COLLECTION_CENTER") return Response.json({ error: "Only collection centres can collect batches" }, { status: 403 });
    const batch = await db.harvestBatch.findUniqueOrThrow({ where: { id } });
    if (batch.status !== "HARVESTED") return Response.json({ error: "Batch is not ready for collection" }, { status: 409 });
    const actor = await db.user.findFirstOrThrow({ where: { role: "COLLECTION_CENTER" } });
    const updated = await db.harvestBatch.update({ where: { id }, data: { status: "COLLECTION" } });
    const block = await appendBlock({ batchId: id, eventType: "COLLECTED_AT_CENTER", actorId: actor.id, payload: data });
    return Response.json({ batch: updated, blockHash: block.hash });
  } catch (error) { return Response.json({ error: error instanceof z.ZodError ? error.issues : "Unable to collect batch" }, { status: 400 }); }
}