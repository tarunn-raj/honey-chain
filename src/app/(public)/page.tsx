import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Activity, ArrowRight, Blocks, Boxes, CheckCircle2, ChevronDown, Cpu, Database, Fingerprint, Leaf, ShieldCheck, Sparkles, Users, Waves } from "lucide-react";
import { generatePNGDataUrl, makeVerificationUrl } from "@/lib/qr";
import { db } from "@/lib/db";
import { CountUp } from "@/components/count-up";

export default async function LandingPage() {
  const [verifiedBatches, demoUnit] = await Promise.all([
    db.harvestBatch.count({ where: { blocks: { some: {} } } }),
    db.qRUnit.findFirst({ orderBy: { bottleNo: "asc" }, select: { code: true } }),
  ]);
  const verificationUrl = demoUnit ? makeVerificationUrl(demoUnit.code) : null;
  const qrImage = verificationUrl ? await generatePNGDataUrl(verificationUrl) : null;

  return (
    <main className="landing-shell">
      <div className="landing-grid" />
      <nav className="landing-nav">
        <Link href="/" className="landing-brand"><span className="brand-hex">⌁</span><span>HONEY<span>CHAIN</span></span></Link>
        <div className="hidden items-center gap-7 text-sm font-semibold text-[#78350F]/75 md:flex">
          <a href="#how-it-works">How it works</a><a href="#for-everyone">For every link</a><a href="#technology">Technology</a>
        </div>
        <div className="flex items-center gap-2">{verificationUrl ? <Link href={verificationUrl} className="landing-nav-link hidden sm:inline">Verify a bottle</Link> : <span className="landing-nav-link hidden cursor-not-allowed opacity-50 sm:inline">Verification unavailable</span>}<Link href="/dashboard" className="landing-nav-cta">Open platform <ArrowRight className="size-4" /></Link></div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> KVIC Honey Mission · Smart India Hackathon 2026</div>
          <h1>Every drop has<br /><em>a story worth trusting.</em></h1>
          <p className="hero-lede">Honey Chain connects beekeepers, labs, and families with one transparent record — from the hive to the breakfast table.</p>
          <div className="hero-actions">{verificationUrl ? <Link href={verificationUrl} className="primary-button">Verify a bottle <ArrowRight className="size-4" /></Link> : <span className="primary-button cursor-not-allowed opacity-50">Verification unavailable</span>}<a href="#how-it-works" className="secondary-button">See how it works <ChevronDown className="size-4" /></a></div>
          <div className="hero-proof"><div className="proof-avatars"><span>RK</span><span>AS</span><span>KV</span><span>+</span></div><p><strong><CountUp value={verifiedBatches} /></strong> batches already carry a verifiable story</p></div>
        </div>
        <div className="hero-art">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="honeycomb-large honeycomb-a" /><div className="honeycomb-large honeycomb-b" />
          <div className="hero-hive-card"><div className="live-pill"><span /> LIVE NETWORK</div><div className="hive-card-number"><CountUp value={verifiedBatches} /></div><div className="hive-card-label">verified harvest batches</div><div className="mini-chart"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="hive-card-foot"><span>Last block anchored</span><strong>just now ↗</strong></div></div>
          <div className="bee-token bee-one">✦</div><div className="bee-token bee-two">✦</div>
        </div>
      </section>

      <section className="trust-strip"><div><span className="trust-icon"><ShieldCheck /></span><span><strong>FSSAI-aware</strong><small>lab verification</small></span></div><div><span className="trust-icon"><Blocks /></span><span><strong>Tamper-evident</strong><small>SHA-256 ledger</small></span></div><div><span className="trust-icon"><Activity /></span><span><strong>Hive intelligence</strong><small>live IoT telemetry</small></span></div><div><span className="trust-icon"><Leaf /></span><span><strong>KVIC aligned</strong><small>cluster-first growth</small></span></div></section>

      <section className="landing-section problem-section" id="problem">
        <div className="section-intro"><span className="section-number">01</span><div><p className="landing-kicker">The problem</p><h2>Trust should be<br /><em>in the bottle.</em></h2></div></div>
        <div className="problem-grid"><p className="problem-lede">India&apos;s beekeepers do the hard work. But fragmented records, adulteration, and invisible supply chains make it difficult for honest honey to earn the trust it deserves.</p><div className="stat-card"><strong>₹1,000Cr+</strong><span>annual honey market at risk from adulteration</span></div><div className="stat-card"><strong>60%</strong><span>of honey samples flagged in some regional surveys</span></div><div className="stat-card"><strong>4 in 10</strong><span>small producers lack a digital traceability trail</span></div></div>
      </section>

      <section className="landing-section how-section" id="how-it-works">
        <div className="section-heading-centered"><p className="landing-kicker">The Honey Chain promise</p><h2>From hive to <em>home.</em></h2><p>One shared source of truth for everyone who cares where honey comes from.</p></div>
        <div className="steps-grid"><Step number="01" icon={<Waves />} title="Sense" copy="Smart hive sensors watch temperature, humidity, weight, sound, and colony health." /><Step number="02" icon={<Fingerprint />} title="Record" copy="Every harvest, lab result, and hand-off becomes a signed block in the chain." /><Step number="03" icon={<QrCodeMark />} title="Verify" copy="A scan reveals the beekeeper, lab certificate, journey, and hive conditions." /><Step number="04" icon={<Sparkles />} title="Grow" copy="AI insights and shared data help clusters produce more, better honey." /></div>
      </section>

      <section className="landing-section roles-section" id="for-everyone">
        <div className="section-heading-centered"><p className="landing-kicker">Built for the whole ecosystem</p><h2>One chain. <em>Three wins.</em></h2></div>
        <div className="roles-grid"><Role icon={<Users />} title="For beekeepers" copy="Get a digital identity for every hive, early health warnings, and proof that earns a fairer price." bullets={["Offline-first field tools", "AI colony health signals", "Transparent batch records"]} /><Role icon={<ShieldCheck />} title="For consumers" copy="Scan once to meet your beekeeper, inspect lab results, and know your honey is the real thing." bullets={["Instant QR verification", "FSSAI-aware test results", "A story worth sharing"]} featured /><Role icon={<Boxes />} title="For KVIC" copy="See the network at cluster scale, measure outcomes, and make the Honey Mission data-led." bullets={["Cluster-wide visibility", "Interoperable integrations", "Evidence for impact"]} /></div>
      </section>

      <section className="landing-section demo-section">
        <div className="demo-copy"><p className="landing-kicker">Try the live demo</p><h2>Scan the story<br /><em>yourself.</em></h2><p>{verificationUrl ? "This QR is connected to a live Honey Chain batch. Point your phone camera at it — no app, no login, just proof." : "A live verification QR will appear here when a seeded QR unit is available."}</p>{verificationUrl && <Link href={verificationUrl} className="text-link">Open verification page <ArrowRight className="size-4" /></Link>}</div>
        <div className="demo-qr-card"><div className="qr-frame">{qrImage ? <Image src={qrImage} alt="Live Honey Chain verification QR code" width={240} height={240} unoptimized /> : <span className="qr-empty">No live QR available</span>}</div><div><p className="qr-overline">{verificationUrl ? "LIVE VERIFICATION" : "DEMO UNAVAILABLE"}</p><strong>{demoUnit?.code ?? "No seeded QR unit"}</strong><span>{verificationUrl ? "Scan with your phone camera" : "Seed a QR unit to enable verification"}</span></div></div>
      </section>

      <section className="landing-section architecture-section" id="technology">
        <div className="section-heading-centered"><p className="landing-kicker">Under the honeycomb</p><h2>Simple for people.<br /><em>Serious underneath.</em></h2></div>
        <div className="arch-diagram"><ArchNode icon={<Waves />} title="Edge" copy="ESP32 · LoRa · Offline outbox" /><div className="arch-line" /><ArchNode icon={<Database />} title="Honey Chain" copy="Next.js · PostgreSQL · SHA-256" main /><div className="arch-line" /><ArchNode icon={<Cpu />} title="Intelligence" copy="AI service · Alerts · Insights" /></div>
      </section>

      <section className="landing-section team-section"><div className="team-card"><div><p className="landing-kicker">The people behind the proof</p><h2>Made in India,<br /><em>for every Indian hive.</em></h2></div><div className="team-list"><div><span>TR</span><p><strong>Product & platform</strong><small>Building the rails for trust</small></p></div><div><span>AI</span><p><strong>Intelligence & IoT</strong><small>Making every hive visible</small></p></div><div><span>KV</span><p><strong>Field & mission</strong><small>Grounded in beekeeper reality</small></p></div></div></div></section>
      <footer className="landing-footer"><Link href="/" className="landing-brand"><span className="brand-hex">⌁</span><span>HONEY<span>CHAIN</span></span></Link><p>Trust, from hive to home.</p><span>© 2026 Honey Chain · Built for KVIC Honey Mission</span></footer>
    </main>
  );
}

function Step({ number, icon, title, copy }: { number: string; icon: ReactNode; title: string; copy: string }) { return <div className="step-card"><div className="step-top"><span>{number}</span><div className="step-icon">{icon}</div></div><h3>{title}</h3><p>{copy}</p></div>; }
function Role({ icon, title, copy, bullets, featured = false }: { icon: ReactNode; title: string; copy: string; bullets: string[]; featured?: boolean }) { return <div className={`role-card ${featured ? "role-featured" : ""}`}><div className="role-icon">{icon}</div><h3>{title}</h3><p>{copy}</p><ul>{bullets.map((bullet) => <li key={bullet}><CheckCircle2 />{bullet}</li>)}</ul></div>; }
function ArchNode({ icon, title, copy, main = false }: { icon: ReactNode; title: string; copy: string; main?: boolean }) { return <div className={`arch-node ${main ? "arch-main" : ""}`}><div className="arch-icon">{icon}</div><strong>{title}</strong><span>{copy}</span></div>; }
function QrCodeMark() { return <div className="qr-mark"><span /><span /><span /><span /></div>; }
