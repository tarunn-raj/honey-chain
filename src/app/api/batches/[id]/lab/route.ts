import { z } from "zod";
import { db } from "@/lib/db";
import { appendBlock } from "@/lib/ledger";
import { roleForRequest } from "@/lib/auth";

const schema = z.object({ moisturePct: z.number().min(0), hmfMgKg: z.number().min(0), sucrosePct: z.number().min(0), c4SugarPct: z.number().min(0), antibioticResidue: z.boolean(), pollenProfile: z.string().default("Not supplied"), certificateUrl: z.string().url().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = schema.parse(await request.json());
    if (roleForRequest(request.headers.get("cookie"), "LAB") !== "LAB") return Response.json({ error: "Only labs can submit results" }, { status: 403 });
    const batch = await db.harvestBatch.findUniqueOrThrow({ where: { id } });
    if (batch.status !== "COLLECTION") return Response.json({ error: "Batch is not ready for laboratory testing" }, { status: 409 });
    const actor = await db.user.findFirstOrThrow({ where: { role: "LAB" } });
    const passed = data.moisturePct <= 20 && data.hmfMgKg <= 80 && data.sucrosePct <= 5 && data.c4SugarPct <= 7 && !data.antibioticResidue;
    const test = await db.labTest.create({ data: { ...data, batchId: id, labId: actor.id, testedAt: new Date(), passed } });
    const updated = await db.harvestBatch.update({ where: { id }, data: { status: "LAB_TESTING" } });
    const block = await appendBlock({ batchId: id, eventType: "LAB_RESULT_PUBLISHED", actorId: actor.id, payload: { ...data, passed, fssaiLimits: { moisturePct: 20, hmfMgKg: 80, sucrosePct: 5, c4SugarPct: 7, antibioticResidue: false } } });
    return Response.json({ batch: updated, test, passed, blockHash: block.hash });
  } catch (error) { return Response.json({ error: error instanceof z.ZodError ? error.issues : "Unable to submit lab result" }, { status: 400 }); }
}