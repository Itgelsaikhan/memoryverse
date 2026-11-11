"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, ExternalLink, HeartHandshake, Sparkles, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LocalDate } from "@/components/LocalTime";
import { formatPrice, planDef, planErrorMessage, type MyPlan } from "@/lib/plans";

export type Payment = {
  id: string;
  plan: string;
  period: string;
  amount_cents: number;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
};
export type Contact = { id: string; name: string; email: string; relationship: string | null };

export default function AccountView({
  email,
  plan,
  payments,
  contacts,
  justUpgraded,
}: {
  email: string;
  plan: MyPlan | null;
  payments: Payment[];
  contacts: Contact[];
  justUpgraded: boolean;
}) {
  const router = useRouter();
  const effective = plan?.effective_plan ?? "free";
  const def = planDef(effective);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", relationship: "" });
  const [days, setDays] = useState(plan?.legacy_inactivity_days ?? 365);
  const [daysSaved, setDaysSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    if (error) setError(planErrorMessage(error.message) ?? error.message);
    else router.refresh();
    setBusy(false);
    return !error;
  }

  const supabase = createClient();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Your account</h1>
      <p className="mt-1 text-white/60">{email}</p>

      {justUpgraded && effective !== "free" && (
        <div className="future-gradient mt-6 rounded-2xl p-4 text-center font-medium text-white">
          ✨ Welcome to {def.name}! Your new features are ready.
        </div>
      )}

      {error && <p className="mt-6 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}

      {/* Plan */}
      <section className="glass mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-white/50">CURRENT PLAN</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              {effective !== "free" && <Crown size={20} className="text-amber-mv" />} {def.name}
            </h2>
            {plan?.renews_at && effective !== "free" && (
              <p className="mt-1 text-sm text-white/60">
                {plan.cancel_at_period_end ? "Ends on " : "Renews on "}
                <LocalDate iso={plan.renews_at} />
              </p>
            )}
            <p className="mt-2 text-sm text-white/60">
              {plan?.capsule_count ?? 0} capsule{plan?.capsule_count === 1 ? "" : "s"}
              {effective === "free" ? " of 50" : " · unlimited"}
            </p>
            {effective === "free" && (
              <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-mv"
                  style={{ width: `${Math.min(100, ((plan?.capsule_count ?? 0) / 50) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {effective === "free" ? (
              <Link href="/pricing" className="btn-primary">
                <Sparkles size={16} /> Upgrade
              </Link>
            ) : (
              <>
                {effective === "premium" && (
                  <Link href="/checkout?plan=legacy&period=year" className="btn-ghost">
                    Switch to Legacy
                  </Link>
                )}
                {plan?.cancel_at_period_end ? (
                  <button className="btn-ghost" disabled={busy} onClick={() => run(() => supabase.rpc("set_cancel_at_period_end", { p_cancel: false }))}>
                    Resume subscription
                  </button>
                ) : (
                  <button className="btn-ghost text-red-300" disabled={busy} onClick={() => run(() => supabase.rpc("set_cancel_at_period_end", { p_cancel: true }))}>
                    Cancel subscription
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <ul className="mt-5 grid gap-1 text-sm text-white/70 sm:grid-cols-2">
          {def.features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
        {effective !== "free" && (
          <Link href="/year" className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-mv hover:underline">
            Open your Year in Review →
          </Link>
        )}
      </section>

      {/* Legacy */}
      <section className="glass mt-6 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HeartHandshake size={20} className="text-pink-400" /> Legacy
        </h2>
        {effective !== "legacy" ? (
          <p className="mt-2 text-sm text-white/60">
            Choose people who will receive your memories if you&apos;re ever inactive for a long time.{" "}
            <Link href="/checkout?plan=legacy&period=year" className="text-cyan-mv underline">
              Get Legacy
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/60">
              If you don&apos;t sign in for the period below, these people receive a private link to your opened memories.
              Sealed future capsules are never shared.
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-3 text-sm">
              <label>
                <span className="mb-1 block text-white/70">Deliver after inactivity of</span>
                <select className="input w-auto!" value={days} onChange={(e) => { setDays(Number(e.target.value)); setDaysSaved(false); }}>
                  {[90, 180, 365, 730].map((d) => (
                    <option key={d} value={d}>
                      {d >= 365 ? `${d / 365} year${d > 365 ? "s" : ""}` : `${d / 30} months`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn-ghost"
                disabled={busy}
                onClick={async () => {
                  const { data: auth } = await supabase.auth.getUser();
                  const ok = await run(() => supabase.from("profiles").update({ legacy_inactivity_days: days }).eq("id", auth.user!.id));
                  setDaysSaved(ok);
                }}
              >
                Save
              </button>
              {daysSaved && <span className="text-emerald-300">Saved ✓</span>}
            </div>

            <h3 className="mt-6 text-sm font-semibold">Trusted contacts ({contacts.length}/5)</h3>
            <ul className="mt-2 space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2 text-sm">
                  <span>
                    {c.name} <span className="text-white/50">· {c.email}{c.relationship ? ` · ${c.relationship}` : ""}</span>
                  </span>
                  <button aria-label={`Remove ${c.name}`} disabled={busy} onClick={() => run(() => supabase.from("legacy_contacts").delete().eq("id", c.id))}>
                    <Trash2 size={14} className="text-white/50 hover:text-red-300" />
                  </button>
                </li>
              ))}
            </ul>
            {contacts.length < 5 && (
              <form
                className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await run(() =>
                    supabase.from("legacy_contacts").insert({
                      name: form.name.trim(),
                      email: form.email.trim(),
                      relationship: form.relationship.trim() || null,
                    }),
                  );
                  if (ok) setForm({ name: "", email: "", relationship: "" });
                }}
              >
                <input className="input text-sm" required maxLength={80} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="input text-sm" required type="email" maxLength={200} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="input text-sm" maxLength={40} placeholder="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
                <button className="btn-ghost text-sm" disabled={busy}>
                  <UserPlus size={14} /> Add
                </button>
              </form>
            )}

            <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm">
              <p className="font-medium">See what they would receive</p>
              <p className="text-white/55">Creates a private preview link that works for 24 hours.</p>
              <button
                className="btn-ghost mt-3 text-sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  const { data, error } = await supabase.rpc("create_legacy_preview");
                  if (error) setError(planErrorMessage(error.message) ?? error.message);
                  else setPreviewUrl(`/legacy/${data as string}`);
                  setBusy(false);
                }}
              >
                Create preview link
              </button>
              {previewUrl && (
                <Link href={previewUrl} target="_blank" className="mt-2 flex items-center gap-1 text-cyan-mv underline">
                  Open preview <ExternalLink size={12} />
                </Link>
              )}
            </div>
            <p className="mt-3 text-xs text-white/40">
              In this version deliveries are created by a daily database job and listed for the admin; sending them by email
              needs a mail provider with a verified domain.
            </p>
          </>
        )}
      </section>

      {/* Payments */}
      <section className="glass mt-6 p-6">
        <h2 className="text-lg font-semibold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No payments yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="py-1">Date</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-2"><LocalDate iso={p.created_at} /></td>
                  <td>{planDef(p.plan).name} · {p.period === "year" ? "yearly" : "monthly"}</td>
                  <td>{formatPrice(p.amount_cents)} {p.currency}</td>
                  <td>
                    {p.status}
                    {p.provider === "demo" && <span className="ml-1 rounded bg-white/10 px-1.5 text-xs text-white/60">demo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
