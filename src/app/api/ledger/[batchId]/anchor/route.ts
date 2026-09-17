import { getRoleFromCookie } from "@/lib/auth";
import { anchorBatchOnPolygon } from "@/lib/chain";
import { db } from "@/lib/db";
import { verifyChain } from "@/lib/ledger";

export async function POST(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const role = getRoleFromCookie(request.headers.get("cookie"));
  if (role !== "ADMIN" && role !== "KVIC_OFFICER") {
    return Response.json({ error: "Only administrators can anchor ledger roots." }, { status: role ? 403 : 401 });
  }

  const { batchId } = await params;
  const batch = await db.harvestBatch.findUnique({
    where: { id: batchId },
    include: { blocks: { orderBy: { index: "asc" } } },
  });
  if (!batch) return Response.json({ error: "Batch not found." }, { status: 404 });

  const existingAnchor = batch.blocks.find((block) => block.anchorTxHash)?.anchorTxHash;
  if (existingAnchor) return Response.json({ anchorTxHash: existingAnchor, alreadyAnchored: true });

  const verification = await verifyChain(batchId);
  if (!verification.valid) return Response.json({ error: "Only a valid ledger chain can be anchored." }, { status: 409 });

  try {
    const anchorTxHash = await anchorBatchOnPolygon(batch.batchCode, verification.merkleRoot);
    const lastBlock = batch.blocks.at(-1);
    if (!lastBlock) return Response.json({ error: "Batch has no ledger blocks." }, { status: 409 });
    await db.block.update({ where: { id: lastBlock.id }, data: { anchorTxHash } });
    return Response.json({ anchorTxHash, alreadyAnchored: false });
  } catch (error) {
    console.error("Polygon anchoring failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Polygon anchoring failed." }, { status: 502 });
  }
}
