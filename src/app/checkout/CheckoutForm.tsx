"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, planDef, type Period } from "@/lib/plans";
import { useI18n } from "@/i18n/client";

export default function CheckoutForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const tc = t.checkout;
  const plan = planDef(params.get("plan"));
  const period = (params.get("period") === "year" ? "year" : "month") as Period;
  const price = plan.prices[period];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan.id === "free" || !price) {
    return (
      <div className="glass p-8 text-center">
        <p>{tc.unavailable}</p>
        <Link href="/pricing" className="btn-primary mt-6">
          {tc.backToPricing}
        </Link>
      </div>
    );
  }

  async function pay() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("demo_checkout", { p_plan: plan.id, p_period: period });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/account?upgraded=1");
    router.refresh();
  }

  return (
    <div className="glass p-8">
      <p className="text-xs tracking-widest text-white/50">{tc.label}</p>
      <h1 className="mt-1 text-2xl font-bold">MemoryVerse {t.plans[plan.id].name}</h1>
      <p className="text-sm text-white/60">{t.plans[plan.id].tagline}</p>

      <div className="mt-6 space-y-2 rounded-xl bg-white/5 p-4 text-sm">
        <div className="flex justify-between">
          <span>
            {t.plans[plan.id].name} · {tc.billed(period)}
          </span>
          <span>{formatPrice(price)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
          <span>{tc.totalToday}</span>
          <span>{formatPrice(price)} USD</span>
        </div>
      </div>

      <ul className="mt-5 space-y-1 text-sm text-white/70">
        {t.plans[plan.id].features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-amber-mv/40 bg-amber-mv/10 p-4 text-sm text-amber-mv">
        <strong>{tc.demoTitle}</strong> {tc.demoText}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}

      <button className="btn-primary mt-6 w-full justify-center" onClick={pay} disabled={busy}>
        <ShieldCheck size={16} /> {busy ? tc.processing : tc.confirm(formatPrice(price))}
      </button>
      <Link href="/pricing" className="mt-3 block text-center text-sm text-white/50 hover:text-white">
        {t.common.cancel}
      </Link>
    </div>
  );
}
