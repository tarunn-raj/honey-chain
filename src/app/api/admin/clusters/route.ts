import { z } from "zod";
import { db } from "@/lib/db";
import { getRoleFromCookie } from "@/lib/auth";

const requiredColumns = [
  "clusterName", "district", "state", "lat", "lng", "beekeeperName",
  "beekeeperPhone", "apiaryName", "apiaryLat", "apiaryLng", "hiveCodes",
] as const;

const csvPayloadSchema = z.object({ csv: z.string().trim().min(1) });
const adminRoles = new Set(["ADMIN", "KVIC_OFFICER"]);
type ParsedRow = {
  clusterName: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  beekeeperName: string;
  beekeeperPhone: string;
  apiaryName: string;
  apiaryLat: number;
  apiaryLng: number;
  hives: string[];
};

function numberValue(value: string, label: string, row: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Row ${row}: ${label} must be a number.`);
  return parsed;
}

function parseCsv(input: string) {
  const lines = input.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("Paste a CSV header and at least one data row.");

  const rows = lines.map((line) => {
    const cells: string[] = [];
    let value = "";
    let quoted = false;
    for (const character of line) {
      if (character === '"') quoted = !quoted;
      else if (character === "," && !quoted) {
        cells.push(value.trim());
        value = "";
      } else value += character;
    }
    cells.push(value.trim());
    return cells.map((cell) => cell.replace(/^"|"$/g, "").trim());
  });

  const headers = rows[0]!;
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}`);

  return rows.slice(1).map((cells, index) => {
    const rowNumber = index + 2;
    const row = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""])) as Record<string, string>;
    if (Object.values(row).every((value) => !value)) return null;
    for (const column of requiredColumns) {
      if (!row[column]) throw new Error(`Row ${rowNumber}: ${column} is required.`);
    }
    const hives = row.hiveCodes.split(/[|;]/).map((code) => code.trim()).filter(Boolean);
    if (!hives.length) throw new Error(`Row ${rowNumber}: hiveCodes must contain at least one hive.`);
    if (new Set(hives).size !== hives.length) throw new Error(`Row ${rowNumber}: hiveCodes contain duplicates.`);
    const lat = numberValue(row.lat, "lat", rowNumber);
    const lng = numberValue(row.lng, "lng", rowNumber);
    const apiaryLat = numberValue(row.apiaryLat, "apiaryLat", rowNumber);
    const apiaryLng = numberValue(row.apiaryLng, "apiaryLng", rowNumber);
    if (lat < -90 || lat > 90 || apiaryLat < -90 || apiaryLat > 90) throw new Error(`Row ${rowNumber}: latitude must be between -90 and 90.`);
    if (lng < -180 || lng > 180 || apiaryLng < -180 || apiaryLng > 180) throw new Error(`Row ${rowNumber}: longitude must be between -180 and 180.`);
    return {
      clusterName: row.clusterName,
      district: row.district,
      state: row.state,
      lat,
      lng,
      beekeeperName: row.beekeeperName,
      beekeeperPhone: row.beekeeperPhone,
      apiaryName: row.apiaryName,
      apiaryLat,
      apiaryLng,
      hives,
    } satisfies ParsedRow;
  }).filter((row): row is ParsedRow => row !== null);
}

function authorize(request: Request) {
  const role = getRoleFromCookie(request.headers.get("cookie"));
  if (!role) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!adminRoles.has(role)) return Response.json({ error: "Admin or KVIC officer role required." }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  const unauthorized = authorize(request);
  if (unauthorized) return unauthorized;
  const clusters = await db.cluster.findMany({
    include: {
      users: { where: { role: "BEEKEEPER" }, select: { id: true } },
      apiaries: {
        include: {
          hives: {
            include: { healthAlerts: { where: { resolvedAt: null }, select: { id: true } } },
          },
          harvestBatches: {
            where: { harvestedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } },
            select: { quantityKg: true, labTests: { select: { passed: true } } },
          },
        },
      },
    },
  });

  return Response.json({
    clusters: clusters.map((cluster) => {
      const hives = cluster.apiaries.flatMap((apiary) => apiary.hives);
      const batches = cluster.apiaries.flatMap((apiary) => apiary.harvestBatches);
      const tests = batches.flatMap((batch) => batch.labTests);
      return {
        id: cluster.id,
        name: cluster.name,
        district: cluster.district,
        state: cluster.state,
        lat: cluster.lat,
        lng: cluster.lng,
        hiveCount: hives.length,
        beekeeperCount: cluster.users.length,
        activeAlerts: hives.reduce((count, hive) => count + hive.healthAlerts.length, 0),
        ytdYieldKg: Number(batches.reduce((sum, batch) => sum + batch.quantityKg, 0).toFixed(1)),
        labPassRate: tests.length ? Math.round((tests.filter((test) => test.passed).length / tests.length) * 100) : null,
        health: hives.some((hive) => hive.healthAlerts.length > 0) ? "attention" : "healthy",
        apiaries: cluster.apiaries.map((apiary) => ({
          id: apiary.id, name: apiary.name, lat: apiary.lat, lng: apiary.lng, hiveCount: apiary.hives.length,
        })),
      };
    }),
  });
}

export async function POST(request: Request) {
  const unauthorized = authorize(request);
  if (unauthorized) return unauthorized;
  try {
    const { csv } = csvPayloadSchema.parse(await request.json());
    const rows = parseCsv(csv);
    const hiveCodes = rows.flatMap((row) => row.hives);
    const duplicateCodes = hiveCodes.filter((code, index) => hiveCodes.indexOf(code) !== index);
    if (duplicateCodes.length) throw new Error(`Duplicate hive codes: ${[...new Set(duplicateCodes)].join(", ")}`);

    const first = rows[0]!;
    const result = await db.$transaction(async (transaction) => {
      let cluster = await transaction.cluster.findFirst({
        where: { name: first.clusterName, district: first.district, state: first.state },
      });
      if (!cluster) {
        cluster = await transaction.cluster.create({
          data: { name: first.clusterName, district: first.district, state: first.state, lat: first.lat, lng: first.lng },
        });
      }
      let beekeepers = 0;
      let apiaries = 0;
      let hives = 0;
      for (const row of rows) {
        let beekeeper = await transaction.user.findUnique({ where: { phone: row.beekeeperPhone } });
        if (!beekeeper) {
          beekeeper = await transaction.user.create({
            data: { name: row.beekeeperName, phone: row.beekeeperPhone, role: "BEEKEEPER", clusterId: cluster.id, passwordHash: "demo-password" },
          });
          beekeepers += 1;
        }
        let apiary = await transaction.apiary.findFirst({ where: { name: row.apiaryName, clusterId: cluster.id } });
        if (!apiary) {
          apiary = await transaction.apiary.create({
            data: { name: row.apiaryName, beekeeperId: beekeeper.id, clusterId: cluster.id, lat: row.apiaryLat, lng: row.apiaryLng, hiveCount: row.hives.length },
          });
          apiaries += 1;
        }
        for (const code of row.hives) {
          const exists = await transaction.hive.findUnique({ where: { code } });
          if (!exists) {
            await transaction.hive.create({ data: { code, apiaryId: apiary.id, installedAt: new Date(), status: "HEALTHY" } });
            hives += 1;
          }
        }
      }
      return { clusterId: cluster.id, beekeepers, apiaries, hives };
    });
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return Response.json({
      error: error instanceof z.ZodError ? "Invalid onboarding payload." : error instanceof Error ? error.message : "Unable to onboard cluster.",
    }, { status: 400 });
  }
}
