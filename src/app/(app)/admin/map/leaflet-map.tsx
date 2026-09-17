"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { Card, CardContent } from "@/components/ui/card";

type Apiary = { id: string; name: string; lat: number; lng: number; hiveCount: number };
type Cluster = {
  id: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  hiveCount: number;
  activeAlerts: number;
  health: "healthy" | "attention";
  apiaries: Apiary[];
};

function ZoomToCluster({ cluster }: { cluster: Cluster | null }) {
  const map = useMap();
  useEffect(() => {
    if (!cluster) return;
    map.fitBounds(
      [[cluster.lat, cluster.lng], ...cluster.apiaries.map((apiary) => [apiary.lat, apiary.lng] as [number, number])],
      { padding: [36, 36], maxZoom: 12 },
    );
  }, [cluster, map]);
  return null;
}

export default function LeafletMap() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/clusters", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load cluster map data.");
        return (await response.json()) as { clusters: Cluster[] };
      })
      .then((data) => { if (active) setClusters(data.clusters); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load cluster map data."); });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">KVIC field intelligence</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Cluster map</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Cluster markers scale with hive population. Select a cluster to zoom into its apiaries.</p>
        </header>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[min(72vh,680px)] min-h-[460px] w-full">
              <MapContainer center={[22.5, 79]} zoom={5} scrollWheelZoom className="h-full w-full">
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ZoomToCluster cluster={selected} />
                {clusters.map((cluster) => (
                  <CircleMarker
                    key={cluster.id}
                    center={[cluster.lat, cluster.lng]}
                    radius={Math.max(10, Math.min(30, 8 + Math.sqrt(cluster.hiveCount) * 2))}
                    pathOptions={{ color: cluster.health === "attention" ? "#dc2626" : "#15803d", fillColor: cluster.health === "attention" ? "#dc2626" : "#15803d", fillOpacity: 0.72, weight: 2 }}
                    eventHandlers={{ click: () => setSelected(cluster) }}
                  >
                    <Popup><strong>{cluster.name}</strong><br />{cluster.district}, {cluster.state}<br />{cluster.hiveCount} hives · {cluster.activeAlerts} active alerts</Popup>
                  </CircleMarker>
                ))}
                {selected?.apiaries.map((apiary) => (
                  <CircleMarker key={apiary.id} center={[apiary.lat, apiary.lng]} radius={6} pathOptions={{ color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.85 }}>
                    <Popup><strong>{apiary.name}</strong><br />{apiary.hiveCount} hives</Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-emerald-600" /> Healthy cluster</span>
          <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-red-600" /> Active alert attention</span>
          <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-amber-500" /> Apiary after cluster selection</span>
        </div>
      </div>
    </main>
  );
}
