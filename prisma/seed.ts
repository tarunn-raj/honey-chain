import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const seedEnd = new Date("2026-09-18T12:00:00.000Z");

const clusterData = [
  { name: "Punjab Mustard Belt", district: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.857 },
  { name: "Shivalik Litchi Cluster", district: "Saharanpur", state: "Uttar Pradesh", lat: 29.968, lng: 77.546 },
  { name: "Western Ghats Honey Cluster", district: "Mahabaleshwar", state: "Maharashtra", lat: 17.93, lng: 73.647 },
] as const;

const beekeeperNames = [
  "Harpreet Singh", "Gurpreet Kaur", "Amandeep Gill", "Rajesh Kumar",
  "Neeraj Sharma", "Savitri Pawar", "Vikram Jadhav", "Meena Patil",
] as const;

const floralSources = ["MUSTARD", "LITCHI", "EUCALYPTUS", "JAMUN", "MULTIFLORA"] as const;

function fixedDate(daysAgo: number, hour = 9) {
  return new Date(seedEnd.getTime() - daysAgo * dayMs + hour * hourMs);
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function hashBlock(payload: unknown, previousHash: string | null) {
  return createHash("sha256")
    .update(JSON.stringify({ payload, previousHash }))
    .digest("hex");
}

async function main() {
  await prisma.scanLog.deleteMany();
  await prisma.qRUnit.deleteMany();
  await prisma.block.deleteMany();
  await prisma.processingEvent.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.harvestBatch.deleteMany();
  await prisma.healthAlert.deleteMany();
  await prisma.telemetryReading.deleteMany();
  await prisma.hive.deleteMany();
  await prisma.apiary.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cluster.deleteMany();

  const clusters = await Promise.all(
    clusterData.map((cluster) => prisma.cluster.create({ data: cluster })),
  );

  const users = await Promise.all(
    beekeeperNames.map((name, index) => prisma.user.create({
      data: {
        name,
        phone: `+919800000${String(index + 1).padStart(2, "0")}`,
        role: "BEEKEEPER",
        clusterId: clusters[index % clusters.length].id,
        passwordHash: "demo-password",
      },
    })),
  );

  const [labUser, processorUser, kvicUser] = await Promise.all([
    prisma.user.create({ data: { name: "Punjab Honey Quality Lab", phone: "+91980000101", role: "LAB", clusterId: clusters[0].id, passwordHash: "demo-password" } }),
    prisma.user.create({ data: { name: "Honey Valley Processing Unit", phone: "+91980000102", role: "PROCESSOR", clusterId: clusters[2].id, passwordHash: "demo-password" } }),
    prisma.user.create({ data: { name: "KVIC Regional Officer", phone: "+91980000103", role: "KVIC_OFFICER", clusterId: clusters[0].id, passwordHash: "demo-password" } }),
  ]);

  const apiaries = [];
  const remainingHiveCounts: number[] = Array.from({ length: 12 }, (_, index) => index < 4 ? 4 : 3);
  for (let apiaryIndex = 0; apiaryIndex < 12; apiaryIndex += 1) {
    const cluster = clusters[apiaryIndex % clusters.length];
    const beekeeper = users[apiaryIndex % users.length];
    apiaries.push(await prisma.apiary.create({
      data: {
        name: `${cluster.district} Apiary ${String(apiaryIndex + 1).padStart(2, "0")}`,
        beekeeperId: beekeeper.id,
        clusterId: cluster.id,
        lat: round(cluster.lat + ((apiaryIndex % 4) - 1.5) * 0.012, 6),
        lng: round(cluster.lng + ((apiaryIndex % 3) - 1) * 0.014, 6),
        hiveCount: remainingHiveCounts[apiaryIndex],
      },
    }));
  }

  const hives = [];
  let apiaryCursor = 0;
  for (let hiveIndex = 0; hiveIndex < 40; hiveIndex += 1) {
    while (remainingHiveCounts[apiaryCursor] === 0) apiaryCursor += 1;
    const apiary = apiaries[apiaryCursor];
    remainingHiveCounts[apiaryCursor] -= 1;
    const isVarroaHive = hiveIndex === 7;
    const isQueenlessHive = hiveIndex === 18;
    hives.push(await prisma.hive.create({
      data: {
        code: `HIVE-${String(hiveIndex + 1).padStart(2, "0")}`,
        apiaryId: apiary.id,
        installedAt: new Date("2026-02-01T08:00:00.000Z"),
        status: isVarroaHive ? "DISEASED" : isQueenlessHive ? "AT_RISK" : hiveIndex === 33 ? "ABSCONDED" : "HEALTHY",
      },
    }));
  }

  const telemetry = [];
  for (const [hiveIndex, hive] of hives.entries()) {
    const isVarroaHive = hiveIndex === 7;
    const isQueenlessHive = hiveIndex === 18;
    const baseWeight = 18 + (hiveIndex % 6) * 0.8;
    for (let readingIndex = 0; readingIndex < 30 * 24; readingIndex += 1) {
      const recordedAt = new Date(seedEnd.getTime() - 30 * 24 * hourMs + readingIndex * hourMs);
      const hour = recordedAt.getUTCHours();
      const dailyCurve = Math.sin(((hour - 6) / 24) * Math.PI * 2);
      const flowProgress = readingIndex / (30 * 24);
      const temperature = 27 + dailyCurve * 5 + Math.sin(readingIndex / 31) * 0.8 + (hiveIndex % 3) * 0.2;
      const humidity = 68 - dailyCurve * 13 + Math.cos(readingIndex / 47) * 2;
      const weight = baseWeight + flowProgress * 9 + Math.max(0, Math.sin((hour - 8) / 24 * Math.PI * 2)) * 0.05;
      const normalSound = 260 + dailyCurve * 35 + (hiveIndex % 4) * 4;
      telemetry.push({
        hiveId: hive.id,
        recordedAt,
        tempC: round(temperature),
        humidity: round(Math.max(35, Math.min(95, humidity))),
        weightKg: round(weight),
        soundHz: round(isQueenlessHive ? 245 - Math.max(0, Math.sin(readingIndex / 18)) * 30 : normalSound),
        soundDb: round(isQueenlessHive ? 42 + Math.sin(readingIndex / 9) * 2 : 48 + dailyCurve * 4),
        co2Ppm: round(isVarroaHive ? 780 + Math.abs(Math.sin(readingIndex / 11)) * 220 : 620 + Math.abs(dailyCurve) * 80),
        batteryPct: round(Math.max(62, 99 - readingIndex / 72 - (hiveIndex % 5) * 0.3)),
      });
    }
  }
  await prisma.telemetryReading.createMany({ data: telemetry });

  await prisma.healthAlert.createMany({
    data: [
      { hiveId: hives[7].id, type: "VARROA", severity: "HIGH", confidence: 0.94, detectedAt: fixedDate(4, 11), notes: "Elevated CO2 and irregular acoustic pattern detected." },
      { hiveId: hives[18].id, type: "QUEENLESS", severity: "CRITICAL", confidence: 0.91, detectedAt: fixedDate(3, 10), notes: "Sustained 220-280 Hz energy drop suggests queenless colony." },
      { hiveId: hives[12].id, type: "THERMAL_STRESS", severity: "MEDIUM", confidence: 0.78, detectedAt: fixedDate(8, 14), notes: "Temperature exceeded the preferred daytime range." },
      { hiveId: hives[25].id, type: "SWARM_RISK", severity: "MEDIUM", confidence: 0.73, detectedAt: fixedDate(6, 9), notes: "Weight and acoustic activity indicate possible swarm preparation." },
    ],
  });

  const batches = [];
  const batchStatuses = ["BOTTLED", "PROCESSING", "LAB_TESTING", "COLLECTION", "HARVESTED", "BOTTLED"] as const;
  for (let batchIndex = 0; batchIndex < 6; batchIndex += 1) {
    const apiary = apiaries[batchIndex * 2];
    const batchHives = hives.filter((hive) => hive.apiaryId === apiary.id).slice(0, 2);
    batches.push(await prisma.harvestBatch.create({
      data: {
        batchCode: `HC-2026-${String(batchIndex + 1).padStart(3, "0")}`,
        apiaryId: apiary.id,
        hiveIds: batchHives.map((hive) => hive.id),
        harvestedAt: fixedDate(25 - batchIndex * 3, 8),
        quantityKg: round(42 + batchIndex * 8.5),
        floralSource: floralSources[batchIndex % floralSources.length],
        moisturePct: round(17.2 + batchIndex * 0.25),
        status: batchStatuses[batchIndex],
      },
    }));
  }

  for (const batch of batches.slice(0, 2)) {
    await prisma.labTest.create({
      data: {
        batchId: batch.id,
        labId: labUser.id,
        testedAt: new Date(batch.harvestedAt.getTime() + 5 * dayMs),
        moisturePct: batch.moisturePct,
        hmfMgKg: 12.4,
        sucrosePct: 3.1,
        c4SugarPct: 0.8,
        antibioticResidue: false,
        pollenProfile: batch.floralSource === "MUSTARD" ? "Mustard 72%, Multiflora 18%, Other 10%" : "Litchi 68%, Eucalyptus 21%, Other 11%",
        passed: true,
        certificateUrl: `https://demo.honey-chain.local/certificates/${batch.batchCode}.pdf`,
      },
    });
  }

  for (const [batchIndex, batch] of batches.entries()) {
    if (batchIndex === 0 || batchIndex === 1 || batchIndex === 5) {
      await prisma.processingEvent.createMany({
        data: [
          { batchId: batch.id, processorId: processorUser.id, type: "FILTERED", at: new Date(batch.harvestedAt.getTime() + 7 * dayMs), outputUnits: 0, notes: "Cold filtered through food-grade mesh." },
          { batchId: batch.id, processorId: processorUser.id, type: "BOTTLED", at: new Date(batch.harvestedAt.getTime() + 9 * dayMs), outputUnits: Math.floor(batch.quantityKg * 4), notes: "250 g traceable glass bottles." },
        ],
      });
    }
  }

  let previousHash: string | null = null;
  for (const [batchIndex, batch] of batches.entries()) {
    const actorId = batchIndex % 2 === 0 ? kvicUser.id : users[batchIndex].id;
    const events = ["HARVEST", "COLLECTION", ...(batchIndex < 2 ? ["LAB_TEST"] : []), ...(batchIndex === 0 || batchIndex === 1 || batchIndex === 5 ? ["PROCESSING", "BOTTLING"] : [])];
    for (const [eventIndex, eventType] of events.entries()) {
      const payloadJson = { batchCode: batch.batchCode, eventType, source: "Honey Chain demo seed", sequence: eventIndex };
      const hash = hashBlock(payloadJson, previousHash);
      await prisma.block.create({
        data: {
          index: eventIndex,
          batchId: batch.id,
          eventType,
          actorId,
          payloadJson,
          prevHash: previousHash,
          hash,
          merkleRoot: eventIndex === events.length - 1 ? hashBlock(batch.hiveIds, null) : null,
          anchorTxHash: eventIndex === events.length - 1 && batchIndex === 0 ? "0xDEMO_POLYGON_AMOY_ANCHOR" : null,
        },
      });
      previousHash = hash;
    }
  }

  const qrUnits = [];
  for (let qrIndex = 0; qrIndex < 200; qrIndex += 1) {
    const batch = batches[qrIndex % batches.length];
    const code = `HCQR-${batch.batchCode}-${String(qrIndex + 1).padStart(4, "0")}`;
    const hmac = createHash("sha256").update(`${code}:demo-qr-secret`).digest("hex");
    qrUnits.push({ code, batchId: batch.id, bottleNo: qrIndex + 1, hmac });
  }
  await prisma.qRUnit.createMany({ data: qrUnits });

  console.log(`Seeded ${clusters.length} clusters, ${users.length + 3} users, ${apiaries.length} apiaries, ${hives.length} hives, ${telemetry.length} telemetry readings, ${batches.length} batches, and ${qrUnits.length} QR units.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });