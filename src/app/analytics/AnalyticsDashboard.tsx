"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LineChart, { type LineSeries } from "@/components/charts/LineChart";
import StackedBars from "@/components/charts/StackedBars";
import { countryList, countryName } from "@/lib/countries";
import { INTL_LOCALE } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { INDICATORS, formatChange, formatValue, indicatorDef } from "@/lib/indicators";
import { NEUTRAL, SERIES, TOPIC_ORDER } from "@/lib/palette";
import { topicLabel } from "@/lib/stats";
import { EMOTIONS } from "@/lib/capsules";

export type AnalyticsData = {
  indicators: { code: string; name: string; min_year: number; max_year: number }[];
  ageTopics: { age_group: string; topic: string; n: number }[];
  totalMoments: number;
  countries: number;
  myEmotions: Record<string, number> | null;
};

type Change = {
  country: string;
  first_year: number;
  first_value: number;
  last_year: number;
  last_value: number;
  change: number;
};

const DEFAULT_COUNTRIES = ["MNG", "JPN", "USA"];
const MAX_COUNTRIES = 5;
const AGE_ORDER = ["18–24", "25–34", "35–44", "45–54", "55+"];

export default function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { t, locale } = useI18n();
  const ta = t.analytics;
  const cname = (c: string) => countryName(c, locale);
  const fmtN = (v: number) => v.toLocaleString(INTL_LOCALE[locale]);
  const allCountries = useMemo(() => countryList(locale), [locale]);
  const loaded = useMemo(
    () => INDICATORS.filter((d) => data.indicators.some((i) => i.code === d.code)),
    [data.indicators],
  );
  const [code, setCode] = useState(loaded[0]?.code ?? "");
  const [countries, setCountries] = useState<string[]>(DEFAULT_COUNTRIES);
  const [values, setValues] = useState<{ country: string; year: number; value: number }[] | null>(null);
  const [world, setWorld] = useState<{ year: number; avg_value: number }[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [available, setAvailable] = useState<Set<string>>(new Set());
  const def = indicatorDef(code);
  const tdef = t.indicators[code];

  // Countries that have data for the chosen indicator, plus the world trend and biggest changes
  useEffect(() => {
    if (!code) return;
    let active = true;
    const supabase = createClient();
    Promise.all([
      supabase.rpc("indicator_world_trend", { p_code: code }),
      supabase.rpc("indicator_changes", { p_code: code, p_min_span: 8 }),
      supabase.rpc("indicator_countries", { p_code: code }),
    ]).then(([w, c, a]) => {
      if (!active) return;
      setWorld((w.data ?? []) as { year: number; avg_value: number }[]);
      setChanges((c.data ?? []) as Change[]);
      setAvailable(new Set(((a.data ?? []) as { country: string }[]).map((r) => r.country)));
    });
    return () => {
      active = false;
    };
  }, [code]);

  // Values for the selected countries
  useEffect(() => {
    if (!code || countries.length === 0) return;
    let active = true;
    createClient()
      .from("indicator_values")
      .select("country, year, value")
      .eq("indicator", code)
      .in("country", countries)
      .order("year")
      .then(({ data: rows }) => {
        if (active) setValues((rows ?? []) as { country: string; year: number; value: number }[]);
      });
    return () => {
      active = false;
    };
  }, [code, countries]);

  // Colors follow the country (slot by position in the user's picks), never its rank
  const series: LineSeries[] = useMemo(() => {
    const out: LineSeries[] = countries.map((c, i) => ({
      id: c,
      label: countryName(c, locale),
      color: SERIES[i % SERIES.length],
      points: (values ?? []).filter((v) => v.country === c).map((v) => ({ x: v.year, y: v.value })),
    }));
    if (world.length) {
      out.push({
        id: "world",
        label: ta.worldAverage,
        color: NEUTRAL,
        dashed: true,
        points: world.map((w) => ({ x: w.year, y: w.avg_value })),
      });
    }
    return out;
  }, [countries, values, world, locale, ta.worldAverage]);

  const missing = countries.filter((c) => available.size > 0 && !available.has(c));
  const rises = changes.filter((c) => c.change > 0).slice(0, 5);
  const falls = changes.filter((c) => c.change < 0).slice(0, 5);

  const ageRows = AGE_ORDER.map((g) => ({
    label: g,
    values: Object.fromEntries(data.ageTopics.filter((r) => r.age_group === g).map((r) => [r.topic, r.n])),
  })).filter((r) => Object.keys(r.values).length > 0);
  const ageSegments = TOPIC_ORDER.map((tp, i) => ({ key: tp, label: topicLabel(tp, t.topics), color: SERIES[i] }));

  const yearSpan = data.indicators.length
    ? `${Math.min(...data.indicators.map((i) => i.min_year))}–${Math.max(...data.indicators.map((i) => i.max_year))}`
    : "—";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{ta.title}</h1>
      <p className="mt-1 text-white/60">{ta.subtitle}</p>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: ta.kpiMoments, value: fmtN(data.totalMoments) },
          { label: ta.kpiCountries, value: String(data.countries) },
          { label: ta.kpiIndicators, value: String(data.indicators.length) },
          { label: ta.kpiYears, value: yearSpan },
        ].map((k) => (
          <div key={k.label} className="glass p-5">
            <p className="text-xs tracking-wide text-white/50">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {loaded.length === 0 ? (
        <div className="glass mt-8 p-8 text-center text-white/60">
          {ta.noIndicators}
        </div>
      ) : (
        <>
          {/* Filters — one row above the chart */}
          <div className="glass mt-8 p-6">
            <div className="flex flex-wrap items-center gap-2">
              {loaded.map((d) => (
                <button
                  key={d.code}
                  onClick={() => {
                    setValues(null);
                    setCode(d.code);
                  }}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    code === d.code ? "border-white bg-white/10" : "border-white/15 text-white/70"
                  }`}
                >
                  {t.indicators[d.code]?.short ?? d.short}
                </button>
              ))}
              <span className="mx-2 hidden h-5 w-px bg-white/10 sm:block" />
              {countries.map((c, i) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 py-1 pr-2 pl-3 text-sm"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                  {cname(c)}
                  <button
                    aria-label={ta.remove(cname(c))}
                    onClick={() => setCountries(countries.filter((x) => x !== c))}
                    className="text-white/50 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {countries.length < MAX_COUNTRIES && (
                <select
                  className="input w-auto! py-1! text-sm"
                  value=""
                  onChange={(e) => e.target.value && setCountries([...countries, e.target.value])}
                  aria-label={ta.addCountryAria}
                >
                  <option value="">{ta.addCountry}</option>
                  {allCountries.filter(([c]) => !countries.includes(c) && (available.size === 0 || available.has(c))).map(
                    ([c, n]) => (
                      <option key={c} value={c}>
                        {n}
                      </option>
                    ),
                  )}
                </select>
              )}
            </div>

            <h2 className="mt-6 text-lg font-semibold">{tdef?.name}</h2>
            <p className="text-sm text-white/55">
              {tdef?.description} <span className="text-white/40">({tdef?.unit})</span>
            </p>
            {missing.length > 0 && (
              <p className="mt-2 text-xs text-white/45">{ta.noDataFor(missing.map(cname).join(", "))}</p>
            )}

            <div className="mt-4">
              {values === null ? (
                <div className="h-72 animate-pulse rounded-lg bg-white/[0.03]" />
              ) : (
                <LineChart
                  series={series}
                  format={(v) => formatValue(def, v)}
                  ariaLabel={ta.chartAria(tdef?.name ?? "", countries.map(cname).join(", "))}
                />
              )}
            </div>
            <p className="mt-3 text-xs text-white/40">
              {ta.source}{" "}
              <a href={def?.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                {def?.source}
              </a>
              . {ta.worldAvgNote}
            </p>
          </div>

          {/* Biggest changes */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[
              { title: ta.rises, list: rises, up: true },
              { title: ta.falls, list: falls, up: false },
            ].map((block) => {
              const maxAbs = Math.max(0.0001, ...changes.slice(0, 10).map((c) => Math.abs(c.change)));
              return (
                <div key={block.title} className="glass p-6">
                  <h3 className="flex items-center gap-2 font-semibold">
                    {block.up ? <ArrowUp size={16} /> : <ArrowDown size={16} />} {block.title}
                  </h3>
                  <p className="text-xs text-white/45">
                    {ta.firstVsLatest}{def?.suffix === "%" ? ta.ppNote : ""}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {block.list.length === 0 && <li className="text-sm text-white/40">{ta.noData}</li>}
                    {block.list.map((c) => (
                      <li key={c.country}>
                        <button
                          className="w-full text-left"
                          onClick={() =>
                            !countries.includes(c.country) &&
                            countries.length < MAX_COUNTRIES &&
                            setCountries([...countries, c.country])
                          }
                          title={ta.addToChart}
                        >
                          <div className="flex justify-between text-sm">
                            <span>{cname(c.country)}</span>
                            <span className="font-medium">
                              {formatChange(def, c.change)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(Math.abs(c.change) / maxAbs) * 100}%`,
                                background: block.up ? SERIES[0] : SERIES[1],
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-white/40">
                            {formatValue(def, c.first_value)} ({c.first_year}) → {formatValue(def, c.last_value)} (
                            {c.last_year})
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* What makes people happy at each age */}
      {ageRows.length > 0 && (
        <div className="glass mt-6 p-6">
          <h2 className="text-lg font-semibold">{ta.ageTitle}</h2>
          <p className="mb-5 text-sm text-white/55">
            {ta.ageSub(data.totalMoments)}
          </p>
          <StackedBars rows={ageRows} segments={ageSegments} ariaLabel={ta.ageAria} />
        </div>
      )}

      {/* Personal */}
      <div className="glass mt-6 p-6">
        <h2 className="text-lg font-semibold">{ta.yourTitle}</h2>
        {data.myEmotions === null ? (
          <p className="mt-2 text-sm text-white/60">
            <Link href="/login" className="text-cyan-mv underline">
              {ta.loginLink}
            </Link>{" "}
            {ta.loginRest}
          </p>
        ) : Object.keys(data.myEmotions).length === 0 ? (
          <p className="mt-2 text-sm text-white/60">
            {ta.emptyPersonal}{" "}
            <Link href="/new" className="text-cyan-mv underline">
              {ta.addOne}
            </Link>
          </p>
        ) : (
          (() => {
            const mine = data.myEmotions!;
            const total = Object.values(mine).reduce((a, b) => a + b, 0);
            return (
              <ul className="mt-4 space-y-2">
                {Object.entries(mine)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, n]) => {
                    const em = EMOTIONS.find((e) => e.id === k);
                    return (
                      <li key={k} className="text-sm">
                        <div className="flex justify-between">
                          <span>
                            {em?.emoji ?? "•"} {em ? t.emotions[em.id] : ta.noEmotion}
                          </span>
                          <span className="text-white/60">
                            {n} · {((n / total) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(n / total) * 100}%`, background: em?.color ?? NEUTRAL }}
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            );
          })()
        )}
      </div>
    </div>
  );
}
