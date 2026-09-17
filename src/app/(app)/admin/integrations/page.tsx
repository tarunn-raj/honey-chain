"use client";

import { useState } from "react";
import { CheckCircle2, Database, FileCheck2, Globe2, Landmark, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const integrations = [
  { title: "KVIC Honey Mission beneficiary DB sync", purpose: "Keep beneficiary and cluster enrolment records aligned with the KVIC mission registry.", icon: Database, action: "Run mock sync" },
  { title: "FSSAI licence validation", purpose: "Check processor and lab licence numbers before certificates enter the traceability record.", icon: FileCheck2, action: "Validate demo licence" },
  { title: "ONDC/GeM catalogue push", purpose: "Publish compliant honey lots to public procurement and open commerce catalogues.", icon: Globe2, action: "Preview catalogue push" },
  { title: "e-NAM price feed", purpose: "Bring regional commodity price signals into cluster planning and yield decisions.", icon: Landmark, action: "Refresh demo prices" },
  { title: "DigiLocker certificate issuance", purpose: "Issue tamper-evident lab certificates to producers and buyers.", icon: CheckCircle2, action: "Issue demo certificate" },
  { title: "SMS gateway for feature-phone beekeepers", purpose: "Deliver critical hive alerts where smartphones or data connectivity are unavailable.", icon: MessageSquare, action: "Send mock SMS" },
] as const;

export default function IntegrationsPage() {
  const [running, setRunning] = useState<string | null>(null);
  function runAction(title: string, action: string) {
    setRunning(title);
    window.setTimeout(() => {
      setRunning(null);
      toast.success(`${action} completed`, { description: "Demo stub only — no external system was contacted." });
    }, 650);
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Deployment surface</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Integrations</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A clear boundary between today&apos;s demo adapters and the production partner connections planned for Honey Chain.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map(({ title, purpose, icon: Icon, action }) => (
            <Card key={title} className="flex h-full flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <Icon className="size-6 text-emerald-700" />
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Demo stub</span>
                </div>
                <CardTitle className="mt-3">{title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="text-sm leading-6 text-muted-foreground">{purpose}</p>
                <Button className="mt-auto w-full" variant="outline" onClick={() => runAction(title, action)} disabled={running === title}>
                  {running === title ? <RefreshCw className="animate-spin" /> : null}
                  {running === title ? "Running demo..." : action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="size-5 text-amber-700" /> Mock SMS delivery log</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-white p-4 font-mono text-sm text-amber-950">
              HIVE07 ALERT: Queenless suspected. Inspect within 48h.
            </div>
            <p className="text-xs text-muted-foreground">Demo message only. Production delivery would use the configured SMS gateway and local-language templates.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
