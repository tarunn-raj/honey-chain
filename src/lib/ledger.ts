import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

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

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "hash")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function blockHashInput(block: HashableBlock) {
  return {
    actorId: block.actorId,
    batchId: block.batchId,
    eventType: block.eventType,
    index: block.index,
    payload: block.payloadJson ?? block.payload,
    prevHash: block.prevHash,
  };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function computeBlockHash(block: HashableBlock): string {
  return sha256(JSON.stringify(canonicalize(blockHashInput(block))));
}

export function buildMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256("");

  let level = [...hashes];
  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      nextLevel.push(sha256(left + right));
    }
    level = nextLevel;
  }
  return level[0];
}

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
