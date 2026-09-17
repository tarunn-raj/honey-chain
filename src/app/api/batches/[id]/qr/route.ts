import { createHmac } from "node:crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { appendBlock } from "@/lib/ledger";
import { roleForRequest } from "@/lib/auth";

const schema = z.object({ count: z.number().int().min(1).max(1000) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { count } = schema.parse(await request.json());
    if (roleForRequest(request.headers.get("cookie"), "PROCESSOR") !== "PROCESSOR") return Response.json({ error: "Only processors can assign QR units" }, { status: 403 });
    const batch = await db.harvestBatch.findUniqueOrThrow({ where: { id } });
    if (batch.status !== "BOTTLED") return Response.json({ error: "Batch must be bottled before QR assignment" }, { status: 409 });
    const actor = await db.user.findFirstOrThrow({ where: { role: "PROCESSOR" } });
    const secret = process.env.QR_SECRET ?? "demo-qr-secret";
    const units = Array.from({ length: count }, (_, index) => { const code = `HC-${batch.batchCode}-${nanoid(10)}`; return { code, batchId: id, bottleNo: index + 1, hmac: createHmac("sha256", secret).update(code).digest("hex") }; });
    await db.qRUnit.createMany({ data: units });
    const block = await appendBlock({ batchId: id, eventType: "QR_ASSIGNED", actorId: actor.id, payload: { count, firstCode: units[0].code } });
    return Response.json({ count, blockHash: block.hash, units }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof z.ZodError ? error.issues : "Unable to assign QR units" }, { status: 400 }); }
}