"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const harvestSchema = z.object({
  batchCode: z.string().min(3),
  apiaryId: z.string().min(1),
  hiveIds: z.string().min(1),
  harvestedAt: z.string().min(1),
  quantityKg: z.coerce.number().positive(),
  floralSource: z.enum(["MUSTARD", "LITCHI", "EUCALYPTUS", "JAMUN", "MULTIFLORA"]),
});

type HarvestInput = z.input<typeof harvestSchema>;
type HarvestValues = z.output<typeof harvestSchema>;
type Batch = { id: string; batchCode: string; status: string; quantityKg: number; floralSource: string; harvestedAt: string; apiary: { name: string } };
const pipeline = ["HARVESTED", "COLLECTION", "LAB_TESTING", "PROCESSING", "BOTTLED"];

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HarvestInput, unknown, HarvestValues>({ resolver: zodResolver(harvestSchema), defaultValues: { floralSource: "MULTIFLORA", harvestedAt: new Date().toISOString().slice(0, 16) } });

  async function load() { const response = await fetch("/api/batches", { cache: "no-store" }); const data = await response.json() as { batches: Batch[] }; setBatches(data.batches); }
  // Load the server-owned batch list when this client page mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function onSubmit(values: HarvestValues) {
    const response = await fetch("/api/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, hiveIds: values.hiveIds.split(",").map((value) => value.trim()).filter(Boolean) }) });
    const data = await response.json() as { error?: unknown; blockHash?: string };
    if (!response.ok) { toast.error(typeof data.error === "string" ? data.error : "Could not record harvest"); return; }
    toast.success(`Harvest recorded · block ${data.blockHash?.slice(0, 12)}...`); reset(); setShowForm(false); await load();
  }

  return <main className="min-h-screen bg-[#faf9f5] px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl space-y-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Supply chain</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Honey batches</h1><p className="mt-2 text-sm text-muted-foreground">Follow every lot from apiary harvest to consumer-ready packaging.</p></div><Button onClick={() => setShowForm((value) => !value)}><Plus /> Record harvest</Button></header>
    {showForm && <Card className="border-amber-200 bg-amber-50/50"><CardHeader><CardTitle>Record a harvest</CardTitle></CardHeader><CardContent><form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
      <label className="space-y-1 text-sm">Batch code<Input {...register("batchCode")} placeholder="HC-2026-007" />{errors.batchCode && <span className="text-xs text-red-600">{errors.batchCode.message}</span>}</label>
      <label className="space-y-1 text-sm">Apiary ID<Input {...register("apiaryId")} placeholder="Paste apiary ID" />{errors.apiaryId && <span className="text-xs text-red-600">{errors.apiaryId.message}</span>}</label>
      <label className="space-y-1 text-sm">Hive IDs, comma separated<Input {...register("hiveIds")} placeholder="hive-id-1, hive-id-2" />{errors.hiveIds && <span className="text-xs text-red-600">{errors.hiveIds.message}</span>}</label>
      <label className="space-y-1 text-sm">Harvested at<Input type="datetime-local" {...register("harvestedAt")} /></label><label className="space-y-1 text-sm">Quantity kg<Input type="number" step="0.1" {...register("quantityKg")} />{errors.quantityKg && <span className="text-xs text-red-600">{errors.quantityKg.message}</span>}</label>
      <label className="space-y-1 text-sm">Floral source<select className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" {...register("floralSource")}><option value="MUSTARD">Mustard</option><option value="LITCHI">Litchi</option><option value="EUCALYPTUS">Eucalyptus</option><option value="JAMUN">Jamun</option><option value="MULTIFLORA">Multiflora</option></select></label><div className="md:col-span-3"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Recording..." : "Record and chain harvest"}</Button></div>
    </form></CardContent></Card>}
    <div className="grid gap-4 md:grid-cols-2">{batches.map((batch) => { const stage = pipeline.indexOf(batch.status); return <Link href={`/batches/${batch.id}`} key={batch.id}><Card className="h-full transition-transform hover:-translate-y-1 hover:ring-amber-300"><CardContent className="space-y-5 p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-muted-foreground">{batch.batchCode}</p><h2 className="mt-1 text-xl font-semibold">{batch.apiary.name}</h2></div><ArrowRight className="size-5 text-amber-600" /></div><div className="flex items-center gap-1">{pipeline.map((item, index) => <span key={item} className={`h-2 flex-1 rounded-full ${index <= stage ? "bg-amber-500" : "bg-neutral-200"}`} title={item} />)}</div><div className="flex justify-between text-xs text-muted-foreground"><span>{batch.status.replaceAll("_", " ")}</span><span>{batch.quantityKg} kg · {batch.floralSource}</span></div></CardContent></Card></Link>; })}</div>
  </div></main>;
}
