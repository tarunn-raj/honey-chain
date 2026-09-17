import { db } from "@/lib/db";
import { generatePNGDataUrl, makeVerificationUrl } from "@/lib/qr";
import Image from "next/image";

export default async function LabelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await db.harvestBatch.findUnique({ where: { id }, include: { qrUnits: { orderBy: { bottleNo: "asc" } } } });
  if (!batch) return <main className="p-8">Batch not found.</main>;
  const labels = await Promise.all(batch.qrUnits.map(async (unit) => ({ ...unit, image: await generatePNGDataUrl(makeVerificationUrl(unit.code)) })));

  return <main className="labels-page mx-auto max-w-[210mm] bg-white p-5 text-[#3c2415]"><header className="labels-header mb-5 flex items-end justify-between border-b-2 border-amber-700 pb-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Honey Chain</p><h1 className="text-2xl font-semibold">Traceability labels</h1><p className="text-xs">{batch.batchCode} · {batch.floralSource} · {batch.quantityKg} kg</p></div><p className="text-right text-xs text-neutral-500">{labels.length} labels<br />A4 print sheet</p></header><section className="labels-grid">{labels.map((label) => <article className="qr-label honey-hex" key={label.id}><div className="flex items-center justify-between"><strong className="text-[10px] tracking-[0.18em]">HONEY CHAIN</strong><span className="text-[9px] text-amber-800">GENUINE TRACE</span></div><Image src={label.image} alt={`QR verification label ${label.code}`} width={420} height={420} unoptimized /><p className="font-mono text-[9px] font-semibold">{label.code}</p><p className="text-[8px] text-neutral-500">Scan to verify origin</p></article>)}</section></main>;
}
