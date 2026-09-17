"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Circle, Factory, FlaskConical, QrCode, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const stages = ["Harvest", "Collection", "Lab", "Processing", "Bottled", "QR Assigned", "Dispatched", "Retail Received"];
const roles = ["BEEKEEPER", "COLLECTION_CENTER", "LAB", "PROCESSOR", "ADMIN"] as const;
const collectionSchema = z.object({ centerName: z.string().min(2), receivedQuantityKg: z.coerce.number().positive(), notes: z.string().optional() });
const labSchema = z.object({ moisturePct: z.coerce.number().min(0), hmfMgKg: z.coerce.number().min(0), sucrosePct: z.coerce.number().min(0), c4SugarPct: z.coerce.number().min(0), antibioticResidue: z.boolean(), pollenProfile: z.string().default("Not supplied") });
const processSchema = z.object({ type: z.enum(["PROCESSED", "BOTTLED"]), outputUnits: z.coerce.number().int().positive(), notes: z.string().optional() });
const qrSchema = z.object({ count: z.coerce.number().int().min(1).max(1000) });

type Detail = { batch: { id: string; batchCode: string; status: string; quantityKg: number; floralSource: string; apiary: { name: string; beekeeper: { name: string }; cluster: { district: string; state: string } }; labTests: { passed: boolean }[]; processingEvents: { type: string; outputUnits: number; processor: { name: string } }[]; blocks: { eventType: string }[] }; verification: { valid: boolean; brokenAtIndex: number | null } };
type FormProps = { onSuccess: (hash: string) => Promise<void>; batchId: string };

type FormLabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & { error?: string };
function FormLabel({ children, error, ...props }: FormLabelProps) { return <label className="space-y-1 text-sm" {...props}>{children}{error && <span className="block text-xs text-red-600">{error}</span>}</label>; }

function CollectionForm({ batchId, onSuccess }: FormProps) {
  type Input = z.input<typeof collectionSchema>; type Output = z.output<typeof collectionSchema>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input, unknown, Output>({ resolver: zodResolver(collectionSchema) });
  return <form className="grid gap-3" onSubmit={handleSubmit(async (values) => { const response = await fetch(`/api/batches/${batchId}/collect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const data = await response.json(); if (!response.ok) return toast.error(typeof data.error === "string" ? data.error : "Collection failed"); await onSuccess(data.blockHash); })}><FormLabel error={errors.centerName?.message}>Collection centre<Input {...register("centerName")} placeholder="Ludhiana collection centre" /></FormLabel><FormLabel error={errors.receivedQuantityKg?.message}>Received quantity kg<Input type="number" step="0.1" {...register("receivedQuantityKg")} /></FormLabel><FormLabel>Notes<Input {...register("notes")} /></FormLabel><Button disabled={isSubmitting}>{isSubmitting ? "Recording..." : "Record collection"}</Button></form>;
}

function LabForm({ batchId, onSuccess }: FormProps) {
  type Input = z.input<typeof labSchema>; type Output = z.output<typeof labSchema>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input, unknown, Output>({ resolver: zodResolver(labSchema), defaultValues: { antibioticResidue: false, pollenProfile: "Not supplied" } });
  return <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(async (values) => { const response = await fetch(`/api/batches/${batchId}/lab`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const data = await response.json(); if (!response.ok) return toast.error(typeof data.error === "string" ? data.error : "Lab submission failed"); toast.info(data.passed ? "FSSAI limits passed" : "FSSAI limits failed"); await onSuccess(data.blockHash); })}><FormLabel error={errors.moisturePct?.message}>Moisture %<Input type="number" step="0.01" {...register("moisturePct")} /></FormLabel><FormLabel error={errors.hmfMgKg?.message}>HMF mg/kg<Input type="number" step="0.1" {...register("hmfMgKg")} /></FormLabel><FormLabel error={errors.sucrosePct?.message}>Sucrose %<Input type="number" step="0.01" {...register("sucrosePct")} /></FormLabel><FormLabel error={errors.c4SugarPct?.message}>C4 sugar %<Input type="number" step="0.01" {...register("c4SugarPct")} /></FormLabel><FormLabel className="flex items-center gap-2"><input type="checkbox" {...register("antibioticResidue")} /> Antibiotic residue detected</FormLabel><FormLabel>Pollen profile<Input {...register("pollenProfile")} /></FormLabel><Button className="md:col-span-2" disabled={isSubmitting}>{isSubmitting ? "Publishing..." : "Publish lab result"}</Button></form>;
}

function ProcessForm({ batchId, onSuccess }: FormProps) {
  type Input = z.input<typeof processSchema>; type Output = z.output<typeof processSchema>;
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Input, unknown, Output>({ resolver: zodResolver(processSchema), defaultValues: { type: "PROCESSED" } });
  return <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(async (values) => { const response = await fetch(`/api/batches/${batchId}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const data = await response.json(); if (!response.ok) return toast.error(typeof data.error === "string" ? data.error : "Processing failed"); await onSuccess(data.blockHash); })}><FormLabel>Event<select className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" {...register("type")}><option value="PROCESSED">Processed</option><option value="BOTTLED">Bottled</option></select></FormLabel><FormLabel>Output units<Input type="number" {...register("outputUnits")} /></FormLabel><FormLabel className="md:col-span-2">Notes<Input {...register("notes")} /></FormLabel><Button className="md:col-span-2" disabled={isSubmitting}>{isSubmitting ? "Recording..." : "Record processing event"}</Button></form>;
}

function QrForm({ batchId, onSuccess }: FormProps) {
  type Input = z.input<typeof qrSchema>; type Output = z.output<typeof qrSchema>;
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Input, unknown, Output>({ resolver: zodResolver(qrSchema), defaultValues: { count: 20 } });
  return <form className="flex gap-3" onSubmit={handleSubmit(async (values) => { const response = await fetch(`/api/batches/${batchId}/qr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const data = await response.json(); if (!response.ok) return toast.error(typeof data.error === "string" ? data.error : "QR assignment failed"); await onSuccess(data.blockHash); })}><FormLabel>Number of QR units<Input type="number" {...register("count")} /></FormLabel><Button className="mt-6" disabled={isSubmitting}>{isSubmitting ? "Assigning..." : "Assign QR units"}</Button></form>;
}

export default function BatchDetail({ batchId }: { batchId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [role, setRole] = useState<(typeof roles)[number]>("BEEKEEPER");
  async function load() { const response = await fetch(`/api/batches/${batchId}`, { cache: "no-store" }); if (response.ok) setDetail(await response.json()); }
  // Synchronize the detail view with the server-owned trace.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { const cookieRole = document.cookie.match(/(?:^|;\s*)role=([^;]+)/)?.[1]; if (roles.includes(cookieRole as (typeof roles)[number])) setRole(cookieRole as (typeof roles)[number]); void load(); }, [batchId]);
  const currentStage = useMemo(() => { if (!detail) return 0; const events = detail.batch.blocks.map((block) => block.eventType); if (events.includes("QR_ASSIGNED")) return 6; if (detail.batch.status === "BOTTLED") return 5; if (detail.batch.status === "PROCESSING") return 3; if (detail.batch.status === "LAB_TESTING") return 3; if (detail.batch.status === "COLLECTION") return 2; return 1; }, [detail]);
  if (!detail) return <main className="p-6 text-muted-foreground">Loading batch trace...</main>;
  const onSuccess = async (hash: string) => { toast.success(`Supply-chain event recorded · block ${hash.slice(0, 12)}...`); await load(); };
  const action = currentStage === 1 && role === "COLLECTION_CENTER" ? <CollectionForm batchId={batchId} onSuccess={onSuccess} /> : currentStage === 2 && role === "LAB" ? <LabForm batchId={batchId} onSuccess={onSuccess} /> : currentStage === 3 && role === "PROCESSOR" ? <ProcessForm batchId={batchId} onSuccess={onSuccess} /> : currentStage === 5 && role === "PROCESSOR" ? <QrForm batchId={batchId} onSuccess={onSuccess} /> : null;
  return <main className="min-h-screen bg-[#faf9f5] px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl space-y-8"><Link href="/batches" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to batches</Link><header><p className="font-mono text-xs text-amber-700">{detail.batch.batchCode}</p><h1 className="mt-2 text-4xl font-semibold">{detail.batch.apiary.name}</h1><p className="mt-2 text-sm text-muted-foreground">{detail.batch.apiary.beekeeper.name} · {detail.batch.apiary.cluster.district}, {detail.batch.apiary.cluster.state} · {detail.batch.quantityKg} kg {detail.batch.floralSource.toLowerCase()}</p></header><div className="overflow-x-auto pb-2"><div className="flex min-w-[760px] items-start">{stages.map((stage, index) => { const completed = index < currentStage; const current = index === currentStage; return <div key={stage} className="flex flex-1 flex-col items-center gap-2"><div className={`flex size-10 items-center justify-center rounded-full border-2 ${completed ? "border-amber-600 bg-amber-500 text-white" : current ? "border-amber-600 bg-white text-amber-700 ring-4 ring-amber-100" : "border-neutral-300 bg-white text-neutral-400"}`}>{completed ? <Check className="size-5" /> : index === 2 ? <FlaskConical className="size-5" /> : index === 3 ? <Factory className="size-5" /> : index === 5 ? <QrCode className="size-5" /> : index > 5 ? <Truck className="size-5" /> : <Circle className="size-4" />}</div><span className={`text-center text-xs font-semibold ${current ? "text-amber-800" : "text-neutral-500"}`}>{stage}</span></div>; })}</div></div><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Traceability record</CardTitle></CardHeader><CardContent className="space-y-3"><p className={detail.verification.valid ? "text-emerald-700" : "text-red-700"}>{detail.verification.valid ? "Hash chain verified" : `Integrity failed at block ${detail.verification.brokenAtIndex}`}</p>{detail.batch.labTests[0] && <p className="text-sm text-muted-foreground">Lab result: {detail.batch.labTests[0].passed ? "Passed FSSAI limits" : "Failed FSSAI limits"}</p>}{detail.batch.processingEvents.map((event) => <p className="text-sm text-muted-foreground" key={`${event.type}-${event.outputUnits}`}>{event.type}: {event.outputUnits} units by {event.processor.name}</p>)}</CardContent></Card><Card><CardHeader><CardTitle>Next role action</CardTitle><p className="text-xs text-muted-foreground">Current demo role: {role}</p></CardHeader><CardContent>{action ?? <p className="text-sm text-muted-foreground">No action available for this role at the current stage.</p>}</CardContent></Card></div></div></main>;
}
