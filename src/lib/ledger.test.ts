import { randomUUID } from "node:crypto";
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  appendBlock,
  buildMerkleRoot,
  getMerkleProof,
  sha256,
  verifyChain,
} from "@/lib/ledger";

const suffix = randomUUID().slice(0, 8);
let batchId: string;
let actorId: string;
let apiaryId: string;

function verifyProof(leaf: string, proof: ReturnType<typeof getMerkleProof>) {
  return proof.reduce(
    (current, step) => step.position === "left"
      ? sha256(step.sibling + current)
      : sha256(current + step.sibling),
    leaf,
  );
}

describe("Honey Chain ledger", () => {
  test("verifies a clean chain", async () => {
    const cluster = await db.cluster.create({
      data: {
        name: `Ledger Test Cluster ${suffix}`,
        district: "Test District",
        state: "Test State",
        lat: 0,
        lng: 0,
      },
    });
    const user = await db.user.create({
      data: {
        name: `Ledger Test User ${suffix}`,
        phone: `+9100000${suffix}`,
        role: "BEEKEEPER",
        clusterId: cluster.id,
        passwordHash: "test-only",
      },
    });
    actorId = user.id;
    const apiary = await db.apiary.create({
      data: {
        name: `Ledger Test Apiary ${suffix}`,
        beekeeperId: user.id,
        clusterId: cluster.id,
        lat: 0,
        lng: 0,
        hiveCount: 0,
      },
    });
    apiaryId = apiary.id;
    const batch = await db.harvestBatch.create({
      data: {
        batchCode: `LEDGER-TEST-${suffix}`,
        apiaryId: apiary.id,
        hiveIds: [],
        harvestedAt: new Date("2026-09-18T00:00:00.000Z"),
        quantityKg: 10,
        floralSource: "MULTIFLORA",
        moisturePct: 17,
        status: "HARVESTED",
      },
    });
    batchId = batch.id;

    await appendBlock({
      batchId,
      eventType: "HARVEST_RECORDED",
      actorId,
      payload: { quantityKg: 10, source: "test" },
    });
    await appendBlock({
      batchId,
      eventType: "COLLECTED_AT_CENTER",
      actorId,
      payload: { center: "Test Collection Center" },
    });

    const result = await verifyChain(batchId);
    assert.equal(result.valid, true);
    assert.equal(result.brokenAtIndex, null);
    assert.deepEqual(result.blocks.map((block) => block.index), [0, 1, 2]);
  });

  test("detects a mutated payload at the correct index", async () => {
    const block = await db.block.findFirstOrThrow({
      where: { batchId, index: 1 },
    });
    await db.block.update({
      where: { id: block.id },
      data: { payloadJson: { quantityKg: 9999, source: "tampered" } },
    });

    const result = await verifyChain(batchId);
    assert.equal(result.valid, false);
    assert.equal(result.brokenAtIndex, 1);
    assert.equal(result.blocks.find((item) => item.index === 1)?.ok, false);

    await db.block.update({
      where: { id: block.id },
      data: { payloadJson: block.payloadJson as Prisma.InputJsonValue },
    });
  });

  test("validates a Merkle proof", () => {
    const leaves = ["leaf-a", "leaf-b", "leaf-c", "leaf-d", "leaf-e"].map(sha256);
    const targetIndex = 4;
    const proof = getMerkleProof(leaves, targetIndex);

    assert.equal(verifyProof(leaves[targetIndex], proof), buildMerkleRoot(leaves));
  });
});

after(async () => {
  if (batchId) {
    await db.block.deleteMany({ where: { batchId } });
    await db.harvestBatch.delete({ where: { id: batchId } });
  }
  if (apiaryId) await db.apiary.delete({ where: { id: apiaryId } });
  if (actorId) {
    const user = await db.user.findUnique({ where: { id: actorId } });
    await db.user.delete({ where: { id: actorId } });
    if (user?.clusterId) await db.cluster.delete({ where: { id: user.clusterId } });
  }
  await db.$disconnect();
});
