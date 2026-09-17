import { db } from "@/lib/db";
import { verifyChain } from "@/lib/ledger";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const batch = await db.harvestBatch.findUnique({
    where: { id },
    include: {
      apiary: { include: { beekeeper: { select: { name: true } }, cluster: true } },
      labTests: { include: { lab: { select: { name: true } } }, orderBy: { testedAt: "desc" } },
      processingEvents: { include: { processor: { select: { name: true } } }, orderBy: { at: "asc" } },
      qrUnits: { orderBy: { bottleNo: "asc" }, take: 20 },
      blocks: { include: { actor: { select: { name: true } } }, orderBy: { index: "asc" } },
    },
  });
  if (!batch) return Response.json({ error: "Batch not found" }, { status: 404 });
  return Response.json({ batch, verification: await verifyChain(id) });
}