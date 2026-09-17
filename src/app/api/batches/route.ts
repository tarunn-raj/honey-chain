import { z } from "zod";
import { db } from "@/lib/db";
import { appendBlock } from "@/lib/ledger";
import { roleForRequest } from "@/lib/auth";

const harvestSchema = z.object({
  batchCode: z.string().min(3),
  apiaryId: z.string().min(1),
  hiveIds: z.array(z.string()).min(1),
  harvestedAt: z.coerce.date(),
  quantityKg: z.number().positive(),
  floralSource: z.enum(["MUSTARD", "LITCHI", "EUCALYPTUS", "JAMUN", "MULTIFLORA"]),
});

export async function GET() {
  const batches = await db.harvestBatch.findMany({
    orderBy: { harvestedAt: "desc" },
    include: { apiary: { select: { name: true } }, labTests: true, processingEvents: true, qrUnits: { select: { id: true } } },
  });
  return Response.json({ batches });
}

export async function POST(request: Request) {
  try {
    const data = harvestSchema.parse(await request.json());
    const role = roleForRequest(request.headers.get("cookie"), "BEEKEEPER");
    if (role !== "BEEKEEPER") return Response.json({ error: "Only beekeepers can record harvests" }, { status: 403 });
    const actor = await db.user.findFirstOrThrow({ where: { role: "BEEKEEPER" }, orderBy: { createdAt: "asc" } });
    const batch = await db.harvestBatch.create({ data: { ...data, moisturePct: 0, status: "HARVESTED" } });
    const block = await appendBlock({ batchId: batch.id, eventType: "HARVEST_RECORDED", actorId: actor.id, payload: data });
    return Response.json({ batch, blockHash: block.hash }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof z.ZodError ? error.issues : "Unable to record harvest" }, { status: 400 });
  }
}