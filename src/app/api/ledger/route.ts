import { db } from "@/lib/db";
import { verifyChain } from "@/lib/ledger";
import { isPolygonAnchoringAvailable } from "@/lib/chain";

export async function GET() {
  const batches = await db.harvestBatch.findMany({
    orderBy: { harvestedAt: "desc" },
    include: { blocks: { orderBy: { index: "asc" }, include: { actor: { select: { name: true } } } } },
  });

  const chains = await Promise.all(batches.map(async (batch) => ({
    id: batch.id,
    batchCode: batch.batchCode,
    status: batch.status,
    verification: await verifyChain(batch.id),
    blocks: batch.blocks.map((block) => ({
      id: block.id,
      index: block.index,
      eventType: block.eventType,
      actor: block.actor.name,
      hash: block.hash,
      prevHash: block.prevHash,
      anchorTxHash: block.anchorTxHash,
    })),
  })));

  return Response.json({ batches: chains, anchoringAvailable: isPolygonAnchoringAvailable() });
}