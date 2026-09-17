"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[460px] place-items-center text-sm text-muted-foreground">Loading India field map...</div>,
});

export default function MapClient() {
  return <LeafletMap />;
}
