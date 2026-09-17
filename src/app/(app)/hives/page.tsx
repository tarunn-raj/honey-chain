"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Battery, ChevronRight, Droplets, Scale, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Hive = { id: string; code: string; status: "HEALTHY" | "AT_RISK" | "DISEASED" | "ABSCONDED"; apiary: string; latest: { tempC: number; humidity: number; weightKg: number; batteryPct: number; recordedAt: string } | null; alerts: { id: string }[] };
const statusStyle = { HEALTHY: "border-emerald-200 bg-emerald-50 text-emerald-800", AT_RISK: "border-amber-200 bg-amber-50 text-amber-800", DISEASED: "border-red-200 bg-red-50 text-red-800", ABSCONDED: "border-slate-300 bg-slate-100 text-slate-700" };

function formatAge(value: string | undefined) { if (!value) return "No telemetry"; const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`; }

export default function HivesPage() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  async function load() { const response = await fetch("/api/hives", { cache: "no-store" }); if (response.ok) { const data = await response.json() as { hives: Hive[] }; setHives(data.hives); setUpdatedAt(new Date()); } }
  // Poll the live telemetry API; the state update is intentionally asynchronous.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 5000); return () => clearInterval(timer); }, []);

  return <main className="min-h-screen bg-[#f7faf8] px-4 py-8 sm:px-8"><div className="mx-auto max-w-7xl space-y-8"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Smart apiary network</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Hive telemetry</h1><p className="mt-2 text-sm text-muted-foreground">Live sensor health across the Honey Chain field network.</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 animate-pulse rounded-full bg-emerald-500" /> Polling every 5 seconds{updatedAt ? ` · ${updatedAt.toLocaleTimeString()}` : ""}</div></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{hives.map((hive) => <Link href={`/hives/${hive.id}`} key={hive.id}><Card className="h-full transition-all hover:-translate-y-1 hover:shadow-lg"><CardContent className="space-y-5 p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-muted-foreground">{hive.code}</p><h2 className="mt-1 font-semibold">{hive.apiary}</h2></div><ChevronRight className="size-5 text-muted-foreground" /></div><div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[hive.status]}`}>{hive.status.replace("_", " ")}</div>{hive.latest ? <><div className="grid grid-cols-2 gap-3 text-sm"><div className="flex items-center gap-2"><Thermometer className="size-4 text-orange-500" />{hive.latest.tempC}°C</div><div className="flex items-center gap-2"><Droplets className="size-4 text-sky-500" />{hive.latest.humidity}%</div><div className="flex items-center gap-2"><Scale className="size-4 text-amber-600" />{hive.latest.weightKg} kg</div><div className="flex items-center gap-2"><Battery className="size-4 text-emerald-600" />{hive.latest.batteryPct}%</div></div><div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Activity className="size-3" /> {formatAge(hive.latest.recordedAt)}</span>{hive.alerts.length > 0 && <span className="font-semibold text-red-600">{hive.alerts.length} alert{hive.alerts.length === 1 ? "" : "s"}</span>}</div></> : <p className="text-sm text-muted-foreground">Waiting for telemetry...</p>}</CardContent></Card></Link>)}</div>{hives.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground">No hives found.</CardContent></Card>}</div></main>;
}
