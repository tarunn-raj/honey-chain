"use client";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#fffbeb] p-6 text-center"><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-700">Honey Chain</p><h1 className="mt-3 text-3xl font-semibold text-[#78350F]">Something interrupted the story.</h1><p className="mt-3 text-sm text-[#9a6b3e]">Please try the page again.</p><button onClick={() => reset()} className="mt-6 rounded-full bg-[#78350F] px-5 py-2 text-sm font-bold text-white">Try again</button></div></main>;
}
