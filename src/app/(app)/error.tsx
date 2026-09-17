"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#f7faf8] p-6 text-center"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Honey Chain operations</p><h1 className="mt-3 text-3xl font-semibold text-slate-900">This view needs a fresh connection.</h1><p className="mt-3 text-sm text-slate-500">The data service did not respond as expected.</p><button onClick={() => reset()} className="mt-6 rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white">Retry</button></div></main>;
}
