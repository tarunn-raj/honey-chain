import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { buildMerkleRoot, verifyChain } from "@/lib/ledger";
import { signUnit } from "@/lib/qr";

const stageLabels = [
  ["HARVEST_RECORDED", "Harvest recorded"], ["COLLECTED_AT_CENTER", "Collection centre"],
  ["LAB_RESULT_PUBLISHED", "Lab certified"], ["PROCESSED", "Processed"], ["BOTTLED", "Bottled"],
  ["QR_ASSIGNED", "QR assigned"], ["DISPATCHED", "Dispatched"], ["RETAIL_RECEIVED", "Retail received"],
] as const;
const limits = { moisturePct: 20, hmfMgKg: 80, sucrosePct: 5, c4SugarPct: 7 };

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function safeSignatureMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function date(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Pending";
}

export default async function VerificationPage({ params, searchParams }: { params: Promise<{ batchId: string }>; searchParams: Promise<{ s?: string }> }) {
  const { batchId: code } = await params;
  const { s: signature = "" } = await searchParams;
  const requestHeaders = await headers();
  const city = requestHeaders.get("x-vercel-ip-city") ?? requestHeaders.get("x-city") ?? "Unknown location";
  const lat = Number(requestHeaders.get("x-vercel-ip-latitude"));
  const lng = Number(requestHeaders.get("x-vercel-ip-longitude"));
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
  const unit = await db.qRUnit.findUnique({ where: { code }, include: { batch: { include: { apiary: { include: { beekeeper: true, cluster: true } }, labTests: { include: { lab: true }, orderBy: { testedAt: "desc" } }, processingEvents: { include: { processor: true }, orderBy: { at: "asc" } }, blocks: { include: { actor: true }, orderBy: { index: "asc" } } } }, scanLogs: { orderBy: { at: "asc" }, take: 1 } } });
  const signatureValid = Boolean(unit && safeSignatureMatch(signature, signUnit(code)));
  let duplicate = false;
  let previousScan: { city: string | null; at: Date } | null = null;

  if (unit) {
    previousScan = unit.scanLogs[0] ? { city: unit.scanLogs[0].city, at: unit.scanLogs[0].at } : null;
    duplicate = Boolean(previousScan && hasLocation && previousScan.city && previousScan.city !== city && unit.scanLogs[0]?.lat !== null && unit.scanLogs[0]?.lng !== null && distanceKm(lat, lng, unit.scanLogs[0].lat!, unit.scanLogs[0].lng!) > 100);
    await db.$transaction([
      db.scanLog.create({ data: { qrCode: code, city, lat: hasLocation ? lat : null, lng: hasLocation ? lng : null, flaggedDuplicate: duplicate } }),
      db.qRUnit.update({ where: { code }, data: { firstScannedAt: unit.firstScannedAt ?? new Date(), scanCount: { increment: 1 } } }),
    ]);
  }

  const verdict = !unit || !signatureValid ? "invalid" : duplicate ? "duplicate" : "genuine";
  const batch = unit?.batch;
  const verification = batch ? await verifyChain(batch.id) : null;
  const lab = batch?.labTests[0];
  const harvestHives = batch ? await db.hive.findMany({ where: { id: { in: batch.hiveIds } }, include: { healthAlerts: { orderBy: { detectedAt: "desc" }, take: 1 } } }) : [];
  const readings = batch ? await db.telemetryReading.findMany({ where: { hiveId: { in: batch.hiveIds }, recordedAt: { lte: batch.harvestedAt } }, orderBy: { recordedAt: "desc" }, take: 120 }) : [];
  const average = (key: "tempC" | "humidity") => readings.length ? (readings.reduce((sum, reading) => sum + reading[key], 0) / readings.length).toFixed(1) : "--";
  const stages = batch ? stageLabels.map(([eventType, label]) => { const block = batch.blocks.find((candidate) => candidate.eventType === eventType); return { label, block }; }) : [];
  const bestBefore = batch ? new Date(new Date(batch.harvestedAt).setFullYear(new Date(batch.harvestedAt).getFullYear() + 2)) : null;
  const proofRoot = verification?.merkleRoot ?? (batch ? buildMerkleRoot(batch.blocks.map((block) => block.hash)) : "");

  return <main className="verify-shell"><div className="verify-glow verify-glow-left" /><div className="verify-glow verify-glow-right" /><div className="relative mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-14">
    <header className="mb-8 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Honey Chain</p><p className="mt-1 text-xs text-[#76553b]">Public product verification</p></div><span className="honey-hex flex size-11 items-center justify-center bg-amber-100 text-xl">⌁</span></header>
    <section className={`verdict-banner verdict-${verdict} reveal`}><div><p className="text-xs font-black uppercase tracking-[0.28em]">{verdict === "genuine" ? "Verified product" : verdict === "duplicate" ? "Verification warning" : "Verification failed"}</p><h1>{verdict === "genuine" ? "GENUINE" : verdict === "duplicate" ? "ALREADY SCANNED ELSEWHERE" : "INVALID SIGNATURE"}</h1><p>{verdict === "duplicate" ? `First recorded in ${previousScan?.city ?? "another location"} on ${date(previousScan?.at)}.` : verdict === "invalid" ? "This code could not be authenticated by Honey Chain." : "This bottle is linked to a tamper-evident supply-chain record."}</p></div><div className="verdict-mark">{verdict === "genuine" ? "✓" : verdict === "duplicate" ? "!" : "×"}</div></section>
    {batch ? <><section className="hero-honey reveal reveal-delay-1"><p className="text-xs font-black uppercase tracking-[0.24em] text-amber-800">{batch.floralSource} honey · {batch.batchCode}</p><h2>Harvested with care,<br /><em>verified with proof.</em></h2><div className="grid grid-cols-3 gap-3 border-t border-amber-900/15 pt-5 text-sm"><div><span>Net weight</span><strong>{batch.quantityKg} kg</strong></div><div><span>Harvest date</span><strong>{date(batch.harvestedAt)}</strong></div><div><span>Best before</span><strong>{date(bestBefore)}</strong></div></div></section>
      <section className="reveal reveal-delay-2"><div className="section-kicker">01 · Source</div><div className="beekeeper-card"><div className="portrait-placeholder">{batch.apiary.beekeeper.name.split(" ").map((part) => part[0]).join("")}</div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Meet your beekeeper</p><h2>{batch.apiary.beekeeper.name}</h2><p>{batch.apiary.name} · {batch.apiary.cluster.district}, {batch.apiary.cluster.state}</p><div className="mt-3 flex gap-2"><span className="mini-pill">KVIC cluster</span><span className="mini-pill">Demo profile · 12 years</span></div></div></div></section>
      <section className="reveal reveal-delay-3"><div className="section-kicker">02 · Journey</div><div className="journey-list">{stages.map(({ label, block }, index) => <div className={`journey-item ${block ? "journey-done" : "journey-pending"}`} key={label}><div className="journey-dot">{block ? "✓" : index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3>{label}</h3><time>{block ? date(block.createdAt) : "Upcoming"}</time></div>{block && <p>{block.actor.name} · <code>{block.hash.slice(0, 16)}...</code></p>}</div></div>)}</div></section>
      <section className="reveal reveal-delay-4"><div className="section-kicker">03 · Lab assurance</div><div className="honey-card"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Certificate of analysis</p><h2>{lab?.passed ? "Within FSSAI limits" : "Review required"}</h2></div><span className={`status-chip ${lab?.passed ? "status-pass" : "status-fail"}`}>{lab?.passed ? "PASS" : "FAIL"}</span></div><div className="mt-5 grid grid-cols-2 gap-3">{([["Moisture", lab?.moisturePct, limits.moisturePct, "%"], ["HMF", lab?.hmfMgKg, limits.hmfMgKg, " mg/kg"], ["Sucrose", lab?.sucrosePct, limits.sucrosePct, "%"], ["C4 sugar", lab?.c4SugarPct, limits.c4SugarPct, "%"]] as const).map(([name, value, limit, unitLabel]) => <div className="lab-row" key={name}><span>{name}</span><strong>{value ?? "--"}{unitLabel}</strong><small>limit ≤ {limit}{unitLabel}</small></div>)}</div><p className="mt-4 text-xs text-[#76553b]">Antibiotic residue: <strong>{lab?.antibioticResidue ? "Detected" : "Not detected"}</strong></p></div></section>
      <section className="reveal reveal-delay-5"><div className="section-kicker">04 · Blockchain proof</div><details className="honey-card proof-details"><summary><span>Open integrity evidence</span><span className={verification?.valid ? "text-emerald-700" : "text-red-700"}>{verification?.valid ? "CHAIN VERIFIED" : "CHAIN BROKEN"}</span></summary><div className="mt-5 grid gap-3 text-xs"><p><span>Merkle root</span><code>{proofRoot.slice(0, 32)}...</code></p><p><span>Blocks</span><code>{verification?.blocks.length ?? batch.blocks.length}</code></p><p><span>Chain integrity</span><code>{verification?.valid ? "VALID" : `BROKEN AT ${verification?.brokenAtIndex}`}</code></p>{batch.blocks.find((block) => block.anchorTxHash) && <p><span>Anchor transaction</span><a className="text-amber-700 underline" href={`https://amoy.polygonscan.com/tx/${batch.blocks.find((block) => block.anchorTxHash)?.anchorTxHash}`} target="_blank" rel="noreferrer">View Polygon Amoy proof</a></p>}</div></details></section>
      <section className="reveal reveal-delay-5"><div className="section-kicker">05 · Hive conditions at harvest</div><div className="honey-card"><div className="grid grid-cols-3 gap-4"><div><span className="metric-label">Avg temp</span><strong className="metric-value">{average("tempC")}°C</strong></div><div><span className="metric-label">Humidity</span><strong className="metric-value">{average("humidity")}%</strong></div><div><span className="metric-label">Colonies</span><strong className="metric-value">{harvestHives.length}</strong></div></div><p className="mt-5 border-t border-amber-900/10 pt-4 text-sm text-[#76553b]">Health status: <strong>{harvestHives.every((hive) => hive.status === "HEALTHY") ? "All colonies healthy" : "Attention recorded"}</strong></p></div></section>
      <footer className="mt-10 flex flex-wrap gap-3 border-t border-amber-900/15 pt-6"><a className="action-link" href="mailto:trust@honey-chain.example?subject=Suspicious%20Honey%20Product">Report suspicious product</a><a className="action-link action-link-dark" href="mailto:hello@honey-chain.example?subject=Honey%20rating">Rate this honey</a></footer>
    </> : <section className="honey-card reveal"><h1>We could not find this unit</h1><p className="mt-2 text-[#76553b]">Check the QR code and try again.</p></section>}
  </div></main>;
}
