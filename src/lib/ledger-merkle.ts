import { sha256 } from "@/lib/ledger-hash";

/** Builds a deterministic SHA-256 Merkle root, duplicating odd leaves. */
export const buildMerkleRoot = (hashes: string[]): string => {
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
};