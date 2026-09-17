"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudOff, LayoutDashboard, Map, Network, Settings2, Users } from "lucide-react";
import { pendingMutationCount, replayOutbox } from "@/lib/outbox";

export function AdminShell() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  async function refresh() { setOnline(navigator.onLine); setPending(await pendingMutationCount()); }
  // The shell synchronizes browser connectivity and IndexedDB state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); const update = async () => { await replayOutbox(); await refresh(); }; window.addEventListener("online", update); window.addEventListener("offline", refresh); const timer = setInterval(refresh, 3000); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", refresh); clearInterval(timer); }; }, []);
  return <header className="sticky top-0 z-40 border-b bg-white/95 px-4 py-3 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4"><Link href="/dashboard" className="mr-auto text-sm font-black tracking-[0.18em] text-amber-700">HONEY CHAIN</Link><nav className="flex flex-wrap items-center gap-1 text-xs font-semibold text-muted-foreground"><Link className="rounded px-2 py-1 hover:bg-amber-50" href="/dashboard"><LayoutDashboard className="mr-1 inline size-3" />Overview</Link><Link className="rounded px-2 py-1 hover:bg-amber-50" href="/admin/clusters"><Users className="mr-1 inline size-3" />Clusters</Link><Link className="rounded px-2 py-1 hover:bg-amber-50" href="/admin/map"><Map className="mr-1 inline size-3" />Map</Link><Link className="rounded px-2 py-1 hover:bg-amber-50" href="/admin/integrations"><Network className="mr-1 inline size-3" />Integrations</Link><Link className="rounded px-2 py-1 hover:bg-amber-50" href="/hives"><Settings2 className="mr-1 inline size-3" />Hives</Link></nav>{(!online || pending > 0) && <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${online ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800"}`}><CloudOff className="size-3.5" />{online ? `Syncing — ${pending} pending` : `Offline — ${pending} pending`}</div>}</div></header>;
}
