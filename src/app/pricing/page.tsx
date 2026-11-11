import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/plans";

export const metadata = { title: "Pricing · MemoryVerse" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Keep every memory, for as long as you need</h1>
        <p className="mt-3 text-white/60">Start free. Upgrade when your universe grows.</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const highlight = p.id === "premium";
          return (
            <div
              key={p.id}
              className={`glass relative flex flex-col p-7 ${highlight ? "ring-2 ring-violet-mv shadow-[0_0_60px_rgba(139,92,246,0.25)]" : ""}`}
            >
              {highlight && (
                <span className="future-gradient absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="text-sm text-white/55">{p.tagline}</p>
              <p className="mt-5 text-4xl font-bold">
                {p.id === "free" ? "$0" : p.prices.month ? formatPrice(p.prices.month) : formatPrice(p.prices.year!)}
                <span className="text-base font-normal text-white/50">
                  {p.id === "free" ? " forever" : p.prices.month ? " / month" : " / year"}
                </span>
              </p>
              {p.prices.month && p.prices.year ? (
                <p className="mt-1 text-xs text-white/50">or {formatPrice(p.prices.year)} / year (2 months free)</p>
              ) : null}
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-cyan-mv" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 space-y-2">
                {p.id === "free" ? (
                  <Link href="/login?mode=signup" className="btn-ghost w-full justify-center">
                    Start free
                  </Link>
                ) : (
                  (["month", "year"] as const)
                    .filter((per) => p.prices[per])
                    .map((per) => (
                      <Link
                        key={per}
                        href={`/checkout?plan=${p.id}&period=${per}`}
                        className={`${highlight && per === "month" ? "btn-primary" : "btn-ghost"} w-full justify-center`}
                      >
                        Choose {per === "month" ? "monthly" : "yearly"}
                      </Link>
                    ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-center text-xs text-white/40">
        Payments in this version are a demo — no real money is charged. Prices in USD.
      </p>
    </div>
  );
}
