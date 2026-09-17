"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChainBlock = { id: string; index: number; eventType: string; actor: string; hash: string; prevHash: string | null; anchorTxHash: string | null };
type Chain = {
  id: string;
  batchCode: string;
  blocks: ChainBlock[];
  verification: { valid: boolean; brokenAtIndex: number | null; blocks: { index: number; ok: boolean }[] };
};

function shorten(value: string | null) {
  return value ? `${value.slice(0, 12)}...${value.slice(-8)}` : "GENESIS";
}

export default function LedgerPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [anchoringAvailable, setAnchoringAvailable] = useState(false);
  const [anchorTxHashes, setAnchorTxHashes] = useState<Record<string, string>>({});

  async function loadChains() {
    const response = await fetch("/api/ledger", { cache: "no-store" });
    const data = await response.json() as { batches: Chain[]; anchoringAvailable?: boolean };
    setChains(data.batches);
    setAnchoringAvailable(Boolean(data.anchoringAvailable));
    setAnchorTxHashes(Object.fromEntries(data.batches.flatMap((chain) => chain.blocks.filter((block) => block.anchorTxHash).map((block) => [chain.id, block.anchorTxHash!]))));
    setLoading(false);
  }

  // The initial fetch synchronizes the client view with the server ledger.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadChains(); }, []);

  async function tamper(chain: Chain) {
    const block = chain.blocks[Math.min(1, chain.blocks.length - 1)];
    if (!block) return;
    setBusy(chain.id);
    await fetch("/api/demo/tamper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: chain.id, blockIndex: block.index, newQuantityKg: 9999 }) });
    await loadChains();
    setBusy(null);
  }

  async function restore(chain: Chain) {
    setBusy(chain.id);
    await fetch("/api/demo/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: chain.id }) });
    await loadChains();
    setBusy(null);
  }

  async function anchor(chain: Chain) {
    setBusy(chain.id);
    const response = await fetch(`/api/ledger/${chain.id}/anchor`, { method: "POST" });
    const data = await response.json() as { anchorTxHash?: string; error?: string };
    if (response.ok && data.anchorTxHash) setAnchorTxHashes((current) => ({ ...current, [chain.id]: data.anchorTxHash! }));
    else window.alert(data.error ?? "Unable to anchor this batch.");
    setBusy(null);
  }

  if (loading) return <main className="p-6 text-muted-foreground">Loading ledger...</main>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8e7,transparent_42%),#f7f7f5] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col justify-between gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Integrity control room</p>
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-950">Honey Chain Ledger</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">Every supply-chain event is chained, hashed, and ready for a live tamper demonstration.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldAlert className="size-4" /> SHA-256 verification active</div>
        </header>

        {chains.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No ledger batches found.</CardContent></Card>}
        {chains.map((chain) => {
          const brokenIndex = chain.verification.brokenAtIndex;
          return (
            <section key={chain.id} className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Batch</p><h2 className="text-2xl font-semibold text-neutral-950">{chain.batchCode}</h2></div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => void tamper(chain)} disabled={busy === chain.id}><Zap /> Simulate Tampering</Button>
                  <Button variant="outline" onClick={() => void restore(chain)} disabled={busy === chain.id || brokenIndex === null}><RotateCcw /> Restore</Button>
                  {anchoringAvailable && <Button variant="outline" onClick={() => void anchor(chain)} disabled={busy === chain.id || brokenIndex !== null || Boolean(anchorTxHashes[chain.id])}>Anchor to blockchain</Button>}
                </div>
              </div>
              {anchorTxHashes[chain.id] && <p className="text-xs text-emerald-700">Anchored: <a className="underline" href={`https://amoy.polygonscan.com/tx/${anchorTxHashes[chain.id]}`} target="_blank" rel="noreferrer">{shorten(anchorTxHashes[chain.id])}</a></p>}

              <div className={`overflow-hidden rounded-2xl border p-4 transition-all duration-700 ${brokenIndex === null ? "border-emerald-200 bg-emerald-50/70" : "border-red-300 bg-red-50 shadow-[0_0_45px_rgba(239,68,68,0.16)]"}`}>
                <div className="flex items-center gap-3">
                  {brokenIndex === null ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertTriangle className="size-5 animate-pulse text-red-600" />}
                  <p className={`text-sm font-bold tracking-wide ${brokenIndex === null ? "text-emerald-800" : "text-red-800"}`}>{brokenIndex === null ? "Ledger integrity verified" : `Ledger integrity check FAILED at block ${brokenIndex}`}</p>
                </div>
              </div>

              <div className="relative ml-2 space-y-3 border-l-2 border-neutral-200 pl-6">
                {chain.blocks.map((block) => {
                  const isBroken = brokenIndex === block.index;
                  const isUpstreamBroken = brokenIndex !== null && block.index > brokenIndex;
                  return (
                    <Card key={block.id} className={`relative transition-all duration-700 ${isBroken ? "ledger-block-broken border-red-400 bg-red-50 ring-2 ring-red-300" : isUpstreamBroken ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
                      <span className={`absolute -left-[2.05rem] top-6 size-3 rounded-full border-2 border-white ${isBroken ? "bg-red-600" : isUpstreamBroken ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <CardHeader className="flex-row items-start justify-between gap-3 border-b border-black/5">
                        <div><CardTitle className="flex items-center gap-2 text-base"><span className="font-mono text-xs text-neutral-500">#{block.index}</span>{block.eventType}</CardTitle><p className="mt-1 text-xs text-neutral-500">Actor: {block.actor}</p></div>
                        {isBroken && <span className="text-right text-[10px] font-black uppercase tracking-wider text-red-700">HASH MISMATCH — record altered</span>}
                        {isUpstreamBroken && <span className="text-right text-[10px] font-black uppercase tracking-wider text-amber-700">chain broken upstream</span>}
                      </CardHeader>
                      <CardContent className="grid gap-2 pt-4 text-xs font-mono text-neutral-600 sm:grid-cols-2"><p><span className="font-sans font-semibold text-neutral-400">HASH</span> {shorten(block.hash)}</p><p><span className="font-sans font-semibold text-neutral-400">PREV</span> {shorten(block.prevHash)}</p></CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
