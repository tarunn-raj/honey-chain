import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { buildMerkleRoot } from "@/lib/ledger-merkle";
import { computeBlockHash, sha256 } from "@/lib/ledger-hash";

export const EVENT_TYPES = [
  "GENESIS",
  "HIVE_REGISTERED",
  "HARVEST_RECORDED",
  "COLLECTED_AT_CENTER",
  "LAB_SAMPLE_TAKEN",
  "LAB_RESULT_PUBLISHED",
  "PROCESSED",
  "BOTTLED",
  "QR_ASSIGNED",
  "DISPATCHED",
  "RETAIL_RECEIVED",
  "CONSUMER_VERIFIED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

type HashableBlock = {
  index: number;
  batchId: string;
  eventType: string;
  actorId: string;
  payloadJson?: unknown;
  payload?: unknown;
  prevHash: string | null;
  hash?: string | null;
};

export type LedgerBlock = HashableBlock & {
  id: string;
  merkleRoot: string | null;
  createdAt: Date;
};

export type MerkleProofStep = {
  sibling: string;
  position: "left" | "right";
};

export type VerifyChainResult = {
  valid: boolean;
  blocks: {
    index: number;
    eventType: string;
    hash: string;
    prevHash: string | null;
    expectedHash: string;
    ok: boolean;
  }[];
  brokenAtIndex: number | null;
  merkleRoot: string;
};

type BlockBackup = {
  id: string;
  payloadJson: Prisma.JsonValue;
};

const demoBackups = new Map<string, BlockBackup[]>();

export { buildMerkleRoot, computeBlockHash, sha256 };

export function getMerkleProof(hashes: string[], targetIndex: number): MerkleProofStep[] {
  if (targetIndex < 0 || targetIndex >= hashes.length) {
    throw new RangeError("targetIndex must point to an existing hash");
  }

  const proof: MerkleProofStep[] = [];
  let index = targetIndex;
  let level = [...hashes];

  while (level.length > 1) {
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : Math.min(index + 1, level.length - 1);
    proof.push({
      sibling: level[siblingIndex],
      position: isRightNode ? "left" : "right",
    });

    const nextLevel: string[] = [];
    for (let cursor = 0; cursor < level.length; cursor += 2) {
      nextLevel.push(sha256(level[cursor] + (level[cursor + 1] ?? level[cursor])));
    }
    index = Math.floor(index / 2);
    level = nextLevel;
  }

  return proof;
}

export async function appendBlock({
  batchId,
  eventType,
  actorId,
  payload,
}: {
  batchId: string;
  eventType: EventType;
  actorId: string;
  payload: Prisma.InputJsonValue;
}) {
  return db.$transaction(async (transaction) => {
    let latest = await transaction.block.findFirst({
      where: { batchId },
      orderBy: { index: "desc" },
    });

    if (!latest) {
      const genesisPayload = { batchId, message: "Honey Chain genesis block" };
      latest = await transaction.block.create({
        data: {
          index: 0,
          batchId,
          eventType: "GENESIS",
          actorId,
          payloadJson: genesisPayload,
          prevHash: null,
          hash: computeBlockHash({
            index: 0,
            batchId,
            eventType: "GENESIS",
            actorId,
            payloadJson: genesisPayload,
            prevHash: null,
          }),
        },
      });
    }

    const block = await transaction.block.create({
      data: {
        index: latest.index + 1,
        batchId,
        eventType,
        actorId,
        payloadJson: payload,
        prevHash: latest.hash,
        hash: computeBlockHash({
          index: latest.index + 1,
          batchId,
          eventType,
          actorId,
          payloadJson: payload,
          prevHash: latest.hash,
        }),
      },
    });

    const blocks = await transaction.block.findMany({
      where: { batchId },
      orderBy: { index: "asc" },
      select: { hash: true },
    });
    const merkleRoot = buildMerkleRoot(blocks.map(({ hash }) => hash));
    await transaction.block.updateMany({ where: { batchId }, data: { merkleRoot } });

    return { ...block, merkleRoot };
  });
}

export async function verifyChain(batchId: string): Promise<VerifyChainResult> {
  const blocks = await db.block.findMany({
    where: { batchId },
    orderBy: { index: "asc" },
  });
  const hashes = blocks.map(({ hash }) => hash);
  const merkleRoot = buildMerkleRoot(hashes);
  let previousHash: string | null = null;
  let brokenAtIndex: number | null = null;

  const verifiedBlocks = blocks.map((block) => {
    const expectedHash = computeBlockHash(block);
    const ok = expectedHash === block.hash && block.prevHash === previousHash;
    if (!ok && brokenAtIndex === null) brokenAtIndex = block.index;
    previousHash = block.hash;
    return {
      index: block.index,
      eventType: block.eventType,
      hash: block.hash,
      prevHash: block.prevHash,
      expectedHash,
      ok,
    };
  });

  const storedRootIsValid = blocks.every((block) => block.merkleRoot === merkleRoot);
  if (!storedRootIsValid && brokenAtIndex === null) brokenAtIndex = blocks[0]?.index ?? null;

  return {
    valid: verifiedBlocks.length > 0 && brokenAtIndex === null && storedRootIsValid,
    blocks: verifiedBlocks,
    brokenAtIndex,
    merkleRoot,
  };
}

export async function tamperBlock(batchId: string, blockIndex: number, newQuantityKg: number) {
  const blocks = await db.block.findMany({ where: { batchId }, orderBy: { index: "asc" } });
  const block = blocks.find((candidate) => candidate.index === blockIndex);
  if (!block) throw new Error("Block not found");

  if (!demoBackups.has(batchId)) {
    demoBackups.set(batchId, blocks.map(({ id, payloadJson }) => ({ id, payloadJson })));
  }

  const originalPayload = block.payloadJson;
  const nextPayload = originalPayload !== null && typeof originalPayload === "object" && !Array.isArray(originalPayload)
    ? { ...originalPayload, quantityKg: newQuantityKg }
    : { originalPayload, quantityKg: newQuantityKg };

  return db.block.update({
    where: { id: block.id },
    data: { payloadJson: nextPayload as Prisma.InputJsonValue },
  });
}

export async function restoreDemoChain(batchId: string) {
  const backup = demoBackups.get(batchId);
  if (!backup) throw new Error("No demo backup exists for this batch");

  await db.$transaction(
    backup.map(({ id, payloadJson }) => db.block.update({
      where: { id },
      data: { payloadJson: payloadJson as Prisma.InputJsonValue },
    })),
  );
  demoBackups.delete(batchId);
  return verifyChain(batchId);
}
