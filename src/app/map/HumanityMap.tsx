"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EMOTIONS, emotionOf } from "@/lib/capsules";
import { countryName } from "@/lib/countries";
import { MIN_SAMPLE, STAT_EMOTIONS, topicLabel, type CountryStats, type StatEmotion } from "@/lib/stats";

type Feature = GeoJSON.Feature<GeoJSON.Geometry, { iso3: string; name: string; color?: string; strength?: number }>;
type Sample = { text: string; topic: string | null; emotion: string | null; age: number | null; source: string };
type SearchHit = { text: string; topic: string | null; emotion: string | null; country: string | null };

const EMPTY = "#1b2246";

// MapLibre's worker is served from /public (see scripts/copy-maplibre-worker.mjs)
maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");

function colorize(base: GeoJSON.FeatureCollection, stats: Map<string, CountryStats>, filter: StatEmotion | null) {
  const maxTotal = Math.max(1, ...[...stats.values()].map((s) => s.total));
  const shares = filter
    ? [...stats.values()].filter((s) => s.total >= MIN_SAMPLE).map((s) => s[filter] / s.total)
    : [];
  const maxShare = Math.max(0.0001, ...shares);

  return {
    ...base,
    features: base.features.map((f) => {
      const feat = f as Feature;
      const s = stats.get(feat.properties.iso3);
      let color = EMPTY;
      let strength = 0;
      if (s) {
        if (filter) {
          color = emotionOf(filter)?.color ?? EMPTY;
          strength = s.total < MIN_SAMPLE ? 0.12 : 0.15 + 0.8 * (s[filter] / s.total / maxShare);
        } else {
          color = emotionOf(s.top_emotion)?.color ?? EMPTY;
          // log scale so small countries are still visible next to large ones
          strength = 0.25 + 0.65 * (Math.log10(s.total + 1) / Math.log10(maxTotal + 1));
        }
      }
      return { ...feat, properties: { ...feat.properties, color, strength } };
    }),
  } as GeoJSON.FeatureCollection;
}

export default function HumanityMap({ stats }: { stats: CountryStats[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const baseRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<StatEmotion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [mapError, setMapError] = useState(false);

  const byCountry = useMemo(() => new Map(stats.map((s) => [s.country, s])), [stats]);
  const totals = useMemo(() => {
    const t = Object.fromEntries(STAT_EMOTIONS.map((e) => [e, 0])) as Record<StatEmotion, number>;
    let all = 0;
    for (const s of stats) {
      all += s.total;
      for (const e of STAT_EMOTIONS) t[e] += s[e];
    }
    return { all, byEmotion: t };
  }, [stats]);

  // Create the map once
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "#070a1c" } }],
      },
      center: [20, 25],
      zoom: 1.3,
      minZoom: 0.8,
      maxZoom: 6,
      attributionControl: false,
      renderWorldCopies: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ customAttribution: "Natural Earth · HappyDB" }));

    let cancelled = false;
    map.on("load", async () => {
      try {
        const res = await fetch("/data/countries.min.geojson");
        if (!res.ok) throw new Error("geojson");
        const geo = (await res.json()) as GeoJSON.FeatureCollection;
        if (cancelled) return;
        baseRef.current = geo;
        map.addSource("countries", { type: "geojson", data: geo, promoteId: "iso3" });
        map.addLayer({
          id: "fill",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": ["coalesce", ["get", "color"], EMPTY],
            "fill-opacity": ["coalesce", ["get", "strength"], 0.35],
          },
        });
        map.addLayer({
          id: "outline",
          type: "line",
          source: "countries",
          paint: { "line-color": "rgba(255,255,255,0.18)", "line-width": 0.6 },
        });
        map.addLayer({
          id: "selected",
          type: "line",
          source: "countries",
          paint: { "line-color": "#ffffff", "line-width": 2 },
          filter: ["==", ["get", "iso3"], ""],
        });
        map.on("click", "fill", (e: MapLayerMouseEvent) => {
          const iso = e.features?.[0]?.properties?.iso3 as string | undefined;
          if (iso) {
            setSamples(null);
            setSelected(iso);
          }
        });
        map.on("mouseenter", "fill", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "fill", () => (map.getCanvas().style.cursor = ""));
        setReady(true);
      } catch {
        setMapError(true);
      }
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Recolor when data or filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !baseRef.current) return;
    (map.getSource("countries") as GeoJSONSource | undefined)?.setData(colorize(baseRef.current, byCountry, filter));
  }, [ready, byCountry, filter]);

  // Highlight selection and load sample moments
  useEffect(() => {
    const map = mapRef.current;
    if (ready && map) map.setFilter("selected", ["==", ["get", "iso3"], selected ?? ""]);
    if (!selected) return;
    let active = true;
    createClient()
      .rpc("sample_moments", { p_country: selected, p_emotion: filter, p_limit: 6 })
      .then(({ data }) => {
        if (active) setSamples((data ?? []) as Sample[]);
      });
    return () => {
      active = false;
    };
  }, [ready, selected, filter]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    const { data } = await createClient().rpc("search_moments", { p_query: q, p_limit: 20 });
    setHits((data ?? []) as SearchHit[]);
    setSearching(false);
  }

  const sel = selected ? byCountry.get(selected) : undefined;

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] w-full overflow-hidden">
      {/* maplibre's CSS sets position:relative on the map element, so it lives inside an absolute wrapper */}
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" aria-label="World map of shared moments" />
      </div>

      {mapError && (
        <div className="absolute inset-0 grid place-items-center text-white/60">Could not load the map. Please refresh.</div>
      )}

      {/* Left panel: totals, filter, search */}
      <aside className="glass absolute top-4 left-4 z-10 max-h-[calc(100%-2rem)] w-[min(340px,calc(100%-2rem))] overflow-y-auto p-5">
        <h1 className="text-xl font-bold">Humanity Map</h1>
        <p className="mt-1 text-sm text-white/60">
          {totals.all.toLocaleString()} moments from {stats.length} countries
        </p>

        {stats.length === 0 && (
          <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/60">
            No data yet. An admin can import datasets from the Admin page.
          </p>
        )}

        <p className="mt-5 mb-2 text-xs tracking-widest text-white/50">COLOR BY</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => {
              setSamples(null);
              setFilter(null);
            }}
            className={`rounded-full border px-3 py-1 ${!filter ? "border-white bg-white/10" : "border-white/15"}`}
          >
            Top emotion
          </button>
          {EMOTIONS.filter((e) => totals.byEmotion[e.id as StatEmotion] > 0).map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setSamples(null);
                setFilter(e.id as StatEmotion);
              }}
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: filter === e.id ? e.color : "rgba(255,255,255,0.15)",
                background: filter === e.id ? `${e.color}26` : "transparent",
              }}
            >
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40">
          {filter
            ? `Brighter = larger share of "${emotionOf(filter)?.label}" moments (countries with ${MIN_SAMPLE}+ moments).`
            : "Each country takes the color of its most common emotion. Brighter = more moments."}
        </p>

        <form onSubmit={runSearch} className="mt-5 flex gap-2">
          <input
            className="input text-sm"
            placeholder="Search humanity… e.g. graduation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-ghost px-3!" aria-label="Search" disabled={searching}>
            <Search size={16} />
          </button>
        </form>
        {hits && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{hits.length ? `${hits.length} results` : "No results"}</span>
              <button onClick={() => setHits(null)} aria-label="Clear search">
                <X size={14} />
              </button>
            </div>
            {hits.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  if (!h.country) return;
                  setSamples(null);
                  setSelected(h.country);
                }}
                className="block w-full rounded-lg bg-white/5 p-3 text-left text-sm hover:bg-white/10"
              >
                <span className="line-clamp-3">“{h.text}”</span>
                <span className="mt-1 block text-xs text-white/45">
                  {emotionOf(h.emotion)?.emoji} {countryName(h.country)}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Right panel: selected country */}
      {selected && (
        <aside className="glass absolute top-4 right-4 z-10 max-h-[calc(100%-2rem)] w-[min(360px,calc(100%-2rem))] overflow-y-auto p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{countryName(selected)}</h2>
              <p className="text-sm text-white/60">
                {sel ? `${sel.total.toLocaleString()} moments` : "No moments shared yet"}
              </p>
            </div>
            <button onClick={() => setSelected(null)} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {sel && (
            <>
              {sel.total < MIN_SAMPLE && (
                <p className="mt-3 rounded-lg bg-amber-mv/10 p-2 text-xs text-amber-mv">
                  Small sample — percentages may not be representative.
                </p>
              )}
              <div className="mt-4 space-y-2">
                {STAT_EMOTIONS.filter((e) => sel[e] > 0)
                  .sort((a, b) => sel[b] - sel[a])
                  .map((e) => {
                    const em = emotionOf(e)!;
                    const pct = (sel[e] / sel.total) * 100;
                    return (
                      <div key={e} className="text-sm">
                        <div className="flex justify-between">
                          <span>
                            {em.emoji} {em.label}
                          </span>
                          <span className="text-white/60">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: em.color }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <p className="mt-4 text-sm text-white/60">
                Most common topic: <span className="text-white">{topicLabel(sel.top_topic)}</span>
              </p>
            </>
          )}

          <h3 className="mt-6 mb-2 text-xs tracking-widest text-white/50">
            {filter ? `${emotionOf(filter)?.label.toUpperCase()} MOMENTS` : "REAL MOMENTS"}
          </h3>
          {samples === null ? (
            <p className="text-sm text-white/40">Loading…</p>
          ) : samples.length === 0 ? (
            <p className="text-sm text-white/40">Nothing to show here yet.</p>
          ) : (
            <ul className="space-y-2">
              {samples.map((s, i) => (
                <li key={i} className="rounded-lg bg-white/5 p-3 text-sm">
                  “{s.text}”
                  <span className="mt-1 block text-xs text-white/45">
                    {emotionOf(s.emotion)?.emoji} {topicLabel(s.topic)}
                    {s.age ? ` · age ${s.age}` : ""}
                    {s.source === "user" ? " · shared on MemoryVerse" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
