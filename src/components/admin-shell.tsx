"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudOff, LayoutDashboard, Map, Menu, Network, PanelLeftClose, Settings2, Users, X } from "lucide-react";
import { pendingMutationCount, replayOutbox } from "@/lib/outbox";

export function AdminShell() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const publicRoute = pathname === "/" || pathname.startsWith("/verify/");

  async function refresh() {
    setOnline(navigator.onLine);
    setPending(await pendingMutationCount());
  }

  useEffect(() => {
    queueMicrotask(() => {
      setRole(document.cookie.match(/(?:^|;\s*)role=([^;]+)/)?.[1] ?? null);
    });
    queueMicrotask(() => void refresh());
    const update = async () => { await replayOutbox(); await refresh(); };
    window.addEventListener("online", update);
    window.addEventListener("offline", refresh);
    const timer = setInterval(refresh, 3000);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", refresh); clearInterval(timer); };
  }, []);

  if (publicRoute) return null;
  const isAdmin = role === "ADMIN" || role === "KVIC_OFFICER";
  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/hives", label: "Hive network", icon: Settings2 },
    { href: "/batches", label: "Supply chain", icon: Network },
    { href: "/ledger", label: "Ledger", icon: PanelLeftClose },
    ...(isAdmin ? [{ href: "/admin/clusters", label: "Clusters", icon: Users }, { href: "/admin/map", label: "India map", icon: Map }, { href: "/admin/integrations", label: "Integrations", icon: Network }] : []),
  ];

  return <>
    <div className="mobile-topbar md:hidden"><button aria-label="Open navigation" onClick={() => setOpen(true)}><Menu /></button><Link href="/dashboard" className="shell-brand">HONEY <span>CHAIN</span></Link>{(!online || pending > 0) && <span className="shell-status-dot" />}</div>
    {open && <button aria-label="Close navigation" className="sidebar-scrim md:hidden" onClick={() => setOpen(false)} />}
    <aside className={`app-sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-inner"><div className="sidebar-brand-row"><Link href="/dashboard" className="shell-brand">HONEY <span>CHAIN</span></Link><button aria-label="Close navigation" className="md:hidden" onClick={() => setOpen(false)}><X className="size-4" /></button></div>
        <p className="sidebar-kicker">Operations console</p><nav className="sidebar-nav">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}><Icon />{label}</Link>)}</nav>
        <div className="sidebar-bottom">{(!online || pending > 0) && <div className={`shell-offline ${online ? "syncing" : ""}`}><CloudOff className="size-4" /><span>{online ? `Syncing — ${pending} pending` : `Offline — ${pending} pending`}</span></div>}<p>Honey Chain · 2026</p></div>
      </div>
    </aside>
  </>;
}
