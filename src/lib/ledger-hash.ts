import { createHash } from "node:crypto";

export type HashableBlock = {
  index: number;
  batchId: string;
  eventType: string;
  actorId: string;
  payloadJson?: unknown;
  payload?: unknown;
  prevHash: string | null;
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

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function computeBlockHash(block: HashableBlock): string {
  const hashInput = {
    actorId: block.actorId,
    batchId: block.batchId,
    eventType: block.eventType,
    index: block.index,
    payload: block.payloadJson ?? block.payload,
    prevHash: block.prevHash,
  };
  return sha256(JSON.stringify(canonicalize(hashInput)));
}
