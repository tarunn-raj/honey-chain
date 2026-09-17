import "dotenv/config";

const HIVE_CODES = Array.from({ length: 40 }, (_, index) => `HIVE-${String(index + 1).padStart(2, "0")}`);
const args = process.argv.slice(2);
const getArg = (name: string) => args.find((arg) => arg.startsWith(`${name}=`))?.split("=").slice(1).join("=");
const injection = getArg("--inject") as "varroa" | "queenless" | "theft" | "thermal" | undefined;
const targetHive = getArg("--hive");
const baseUrl = getArg("--base-url") ?? process.env.IOT_SIMULATOR_URL ?? "http://localhost:3000";
const intervalMs = Number(getArg("--interval-ms") ?? 3000);
const cycles = Number(getArg("--cycles") ?? (args.includes("--once") ? 1 : Infinity));
const startOffsetHours = Number(getArg("--start-offset-hours") ?? 0);
const deviceKey = process.env.IOT_DEVICE_KEY;

if (!deviceKey) throw new Error("IOT_DEVICE_KEY is required. Add it to .env before running the simulator.");
if (targetHive && !HIVE_CODES.includes(targetHive)) throw new Error(`Unknown hive ${targetHive}. Use HIVE-01 through HIVE-40.`);
if (injection && !["varroa", "queenless", "theft", "thermal"].includes(injection)) throw new Error("Injection must be varroa, queenless, theft, or thermal.");

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/iot/telemetry`;
let cycle = 0;
const simulationStart = Date.now() + startOffsetHours * 60 * 60 * 1000;

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function readingFor(hiveCode: string) {
  const hiveIndex = Number(hiveCode.slice(-2)) - 1;
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const faulted = hiveCode === targetHive;
  const baselineWeight = 24 + (hiveIndex % 7) * 1.4;
  const normalTemperature = 35 + diurnal * 4 + (hiveIndex % 3) * 0.2;
  const normalHumidity = 64 - diurnal * 10 + (hiveIndex % 4);
  const thermal = faulted && injection === "thermal";
  const theft = faulted && injection === "theft";
  const queenless = faulted && injection === "queenless";
  const varroa = faulted && injection === "varroa";
  return {
    recordedAt: new Date().toISOString(),
    tempC: round(thermal ? 41 + Math.sin(cycle) : normalTemperature),
    humidity: round(Math.max(35, Math.min(92, normalHumidity + (varroa ? 12 : 0)))),
    weightKg: round(theft ? baselineWeight - 4.5 : baselineWeight + cycle * 0.03 + Math.max(0, diurnal) * 0.08),
    soundHz: round(queenless ? 185 : 245 + diurnal * 28 + (varroa ? 75 : 0)),
    soundDb: round(queenless || varroa ? 66 : 47 + Math.abs(diurnal) * 3),
    co2Ppm: round(varroa ? 5600 : 850 + Math.abs(diurnal) * 180),
    batteryPct: round(Math.max(60, 94 - cycle * 0.02 - (hiveIndex % 5))),
  };
}

async function postCycle() {
  cycle += 1;
  const recordedAt = new Date(simulationStart + cycle * intervalMs).toISOString();
  const results = await Promise.all(HIVE_CODES.map(async (hiveCode) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiveCode, deviceKey, readings: [{ ...readingFor(hiveCode), recordedAt }] }),
    });
    const body = await response.json() as { acceptedCount?: number; alertsCreated?: number; error?: string };
    return { hiveCode, status: response.status, accepted: body.acceptedCount ?? 0, alerts: body.alertsCreated ?? 0, error: body.error };
  }));
  const accepted = results.reduce((sum, result) => sum + result.accepted, 0);
  const alerts = results.reduce((sum, result) => sum + result.alerts, 0);
  console.log(`\n  Honey Chain IoT cycle ${cycle} · ${recordedAt}`);
  console.log(`  ${"─".repeat(62)}`);
  console.log(`  POST ${endpoint}`);
  console.log(`  Nodes: ${results.length} | Readings accepted: ${accepted} | Alerts created: ${alerts}`);
  for (const result of results.filter((item) => item.alerts > 0 || item.error)) {
    console.log(`  ${result.error ? "✗" : "⚠"} ${result.hiveCode} · HTTP ${result.status} · ${result.error ?? `${result.alerts} alert(s)`}`);
  }
  return accepted;
}

async function main() {
  console.log(`Honey Chain simulator: ${HIVE_CODES.length} hives, ${intervalMs}ms interval, injection=${injection ?? "none"}${targetHive ? `, hive=${targetHive}` : ""}, start offset=${startOffsetHours}h`);
  await postCycle();
  while (cycle < cycles) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    await postCycle();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
