"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MapPin, Plus, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { submitMutation } from "@/lib/outbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const schema = z.object({ csv: z.string().min(20, "Paste the onboarding CSV before submitting.") });
type Cluster = { id: string; name: string; district: string; state: string; hiveCount: number; beekeeperCount: number; activeAlerts: number; ytdYieldKg: number; labPassRate: number | null };
const sample = "clusterName,district,state,lat,lng,beekeeperName,beekeeperPhone,apiaryName,apiaryLat,apiaryLng,hiveCodes\nNew KVIC Cluster,Ludhiana,Punjab,30.90,75.85,Demo Beekeeper,+919999999999,Demo Apiary,30.91,75.86,HIVE-NEW-01|HIVE-NEW-02";

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [dialog, setDialog] = useState(false);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<{ csv: string }>({ resolver: zodResolver(schema) });
  async function load() { const response = await fetch("/api/admin/clusters", { cache: "no-store" }); if (response.ok) setClusters((await response.json()).clusters); }
  // Initial data load is intentionally performed from this client boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);
  async function onboard(values: { csv: string }) { const result = await submitMutation("/api/admin/clusters", values); if (result.queued) { toast.info("Offline: cluster onboarding queued for replay."); setDialog(false); return; } const data = await result.response!.json(); if (!result.response!.ok) { setError("csv", { message: data.error }); return; } toast.success(`Onboarded ${data.apiaries} apiaries and ${data.hives} hives.`); reset(); setDialog(false); await load(); }
  return <main className="min-h-screen bg-[#faf9f5] px-4 py-8 sm:px-8"><div className="mx-auto max-w-7xl space-y-8"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">KVIC operations</p><h1 className="mt-2 text-4xl font-semibold">Cluster management</h1><p className="mt-2 text-sm text-muted-foreground">Scale Honey Chain across regional beekeeping clusters.</p></div><Button onClick={() => setDialog(true)}><Plus /> Onboard new cluster</Button></header><Card><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-amber-50/60 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Cluster</th><th className="p-4">Hives</th><th className="p-4">Beekeepers</th><th className="p-4">Alerts</th><th className="p-4">YTD yield</th><th className="p-4">Lab pass rate</th></tr></thead><tbody>{clusters.map((cluster) => <tr className="border-b last:border-0" key={cluster.id}><td className="p-4"><strong>{cluster.name}</strong><span className="mt-1 block text-xs text-muted-foreground"><MapPin className="mr-1 inline size-3" />{cluster.district}, {cluster.state}</span></td><td className="p-4 font-semibold">{cluster.hiveCount}</td><td className="p-4">{cluster.beekeeperCount}</td><td className={`p-4 font-semibold ${cluster.activeAlerts ? "text-red-700" : "text-emerald-700"}`}>{cluster.activeAlerts}</td><td className="p-4">{cluster.ytdYieldKg} kg</td><td className="p-4">{cluster.labPassRate === null ? "No tests" : `${cluster.labPassRate}%`}</td></tr>)}</tbody></table></CardContent></Card>{dialog && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><Card className="w-full max-w-2xl"><CardContent className="space-y-5 p-6"><div className="flex items-center gap-3"><Building2 className="size-6 text-amber-600" /><div><h2 className="text-xl font-semibold">Onboard new cluster</h2><p className="text-xs text-muted-foreground">One row per apiary. Separate multiple hive codes with `|`.</p></div></div><form className="space-y-3" onSubmit={handleSubmit(onboard)}><textarea className="min-h-56 w-full rounded-lg border border-input bg-background p-3 font-mono text-xs" placeholder={sample} {...register("csv")} />{errors.csv && <p className="text-sm text-red-600">{errors.csv.message}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}><UploadCloud /> {isSubmitting ? "Onboarding..." : "Validate and onboard"}</Button></div></form></CardContent></Card></div>}</div></main>;
}
