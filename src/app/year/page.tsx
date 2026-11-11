import { Suspense } from "react";
import Link from "next/link";
import { Crown, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import { EMOTIONS, formatDay, type Capsule } from "@/lib/capsules";
import { SERIES } from "@/lib/palette";
import type { MyPlan } from "@/lib/plans";
import { getI18n } from "@/i18n/server";

export const metadata = { title: "Year in Review · MemoryVerse" };


export default function YearPage({ searchParams }: PageProps<"/year">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <YearContent searchParams={searchParams} />
    </Suspense>
  );
}

function dateOf(c: Capsule) {
  // memory_date is a calendar day; created_at is a timestamp
  return c.memory_date ? new Date(`${c.memory_date}T12:00:00Z`) : new Date(c.created_at);
}

async function YearContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [supabase, { t, locale }] = await Promise.all([createClient(), getI18n()]);
  const ty = t.year;
  const MONTHS = ty.months;
  const { data: planRow } = await supabase.rpc("my_plan").maybeSingle();
  const plan = planRow as MyPlan | null;

  if (!plan || plan.effective_plan === "free") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Crown className="mx-auto text-amber-mv" size={40} />
        <h1 className="mt-4 text-3xl font-bold">{ty.upsellTitle}</h1>
        <p className="mt-2 text-white/60">
          {ty.upsellText}
        </p>
        <Link href="/pricing" className="btn-primary mt-6">
          {t.common.seePlans}
        </Link>
      </div>
    );
  }

  const { data } = await supabase.rpc("list_my_capsules", { p_kind: null });
  const all = ((data ?? []) as Capsule[]).filter((c) => !c.is_sealed);
  const years = [...new Set(all.map((c) => dateOf(c).getUTCFullYear()))].sort((a, b) => b - a);
  const requested = Number(Array.isArray(sp.y) ? sp.y[0] : sp.y);
  const year = years.includes(requested) ? requested : (years[0] ?? new Date().getUTCFullYear());
  const items = all.filter((c) => dateOf(c).getUTCFullYear() === year).sort((a, b) => +dateOf(a) - +dateOf(b));

  const byMonth = MONTHS.map((_, m) => items.filter((c) => dateOf(c).getUTCMonth() === m).length);
  const maxMonth = Math.max(1, ...byMonth);
  const topMonth = byMonth.indexOf(Math.max(...byMonth));
  const emotionCounts = EMOTIONS.map((e) => ({ ...e, n: items.filter((c) => c.emotion === e.id).length }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n);
  const withEmotion = emotionCounts.reduce((s, e) => s + e.n, 0);
  const count = (key: "topic" | "location_name") => {
    const m = new Map<string, number>();
    for (const c of items) if (c[key]) m.set(c[key]!, (m.get(c[key]!) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  const topics = count("topic");
  const places = count("location_name");
  const first = items[0];
  const last = items[items.length - 1];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-amber-mv">{ty.label}</p>
          <h1 className="text-5xl font-bold">{year}</h1>
        </div>
        {years.length > 1 && (
          <div className="flex gap-2 text-sm">
            {years.map((y) => (
              <Link key={y} href={`/year?y=${y}`} className={`rounded-full border px-3 py-1 ${y === year ? "border-white bg-white/10" : "border-white/15 text-white/60"}`}>
                {y}
              </Link>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="glass mt-8 p-10 text-center text-white/60">
          {ty.noMemories(year)}{" "}
          <Link href="/new" className="text-cyan-mv underline">
            {ty.addOne}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="glass p-5">
              <p className="text-xs text-white/50">{ty.kept}</p>
              <p className="mt-1 text-4xl font-bold">{items.length}</p>
            </div>
            <div className="glass p-5">
              <p className="text-xs text-white/50">{ty.activeMonth}</p>
              <p className="mt-1 text-4xl font-bold">{MONTHS[topMonth]}</p>
            </div>
            <div className="glass p-5">
              <p className="text-xs text-white/50">{ty.mainFeeling}</p>
              <p className="mt-1 text-4xl font-bold">
                {emotionCounts[0] ? `${emotionCounts[0].emoji} ${t.emotions[emotionCounts[0].id]}` : "—"}
              </p>
            </div>
          </div>

          <section className="glass mt-6 p-6">
            <h2 className="font-semibold">{ty.byMonth}</h2>
            <div className="mt-5 flex h-40 items-end gap-2" role="img" aria-label={ty.monthAria(year)}>
              {byMonth.map((n, m) => (
                <div key={m} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-white/60 opacity-0 group-hover:opacity-100">{n}</span>
                  <div
                    className="w-full rounded-t"
                    title={ty.monthTitle(MONTHS[m], n)}
                    style={{ height: `${(n / maxMonth) * 110}px`, minHeight: n ? 4 : 1, background: n ? SERIES[0] : "rgba(255,255,255,0.08)" }}
                  />
                  <span className="text-[10px] text-white/45">{MONTHS[m]}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="glass p-6">
              <h2 className="font-semibold">{ty.emotions}</h2>
              {emotionCounts.length === 0 ? (
                <p className="mt-2 text-sm text-white/50">{ty.emotionsEmpty}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {emotionCounts.map((e) => (
                    <li key={e.id} className="text-sm">
                      <div className="flex justify-between">
                        <span>
                          {e.emoji} {t.emotions[e.id]}
                        </span>
                        <span className="text-white/60">{Math.round((e.n / withEmotion) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${(e.n / withEmotion) * 100}%`, background: e.color }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="glass p-6">
              <h2 className="font-semibold">{ty.placesTopics}</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {places.map(([p, n]) => (
                  <li key={p} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {p}
                    </span>
                    <span className="text-white/50">{n}</span>
                  </li>
                ))}
                {topics.map(([t, n]) => (
                  <li key={t} className="flex justify-between">
                    <span>#{t}</span>
                    <span className="text-white/50">{n}</span>
                  </li>
                ))}
                {places.length + topics.length === 0 && <li className="text-white/50">{ty.placesEmpty}</li>}
              </ul>
            </section>
          </div>

          {first && last && (
            <section className="glass mt-6 grid gap-6 p-6 sm:grid-cols-2">
              {[
                { label: ty.first, c: first },
                { label: ty.latest, c: last },
              ].map(({ label, c }) => (
                <Link key={label} href={`/capsule/${c.id}`} className="block rounded-xl bg-white/5 p-4 hover:bg-white/10">
                  <p className="text-xs text-white/50">{label}</p>
                  <p className="mt-1 font-semibold">{c.title}</p>
                  <p className="text-xs text-white/45">
                    {c.memory_date ? formatDay(c.memory_date, locale) : dateOf(c).toISOString().slice(0, 10)}
                  </p>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
