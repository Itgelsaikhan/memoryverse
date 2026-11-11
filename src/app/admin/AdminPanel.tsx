"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, LineChart, RefreshCw, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INDICATORS, owidCsvToRows, type IndicatorDef } from "@/lib/indicators";

export type IndicatorMeta = { code: string; min_year: number | null; max_year: number | null; updated_at: string };

type Dataset = { columns: string[]; rows: unknown[][]; source: string };

const DATASETS = [
  {
    id: "happydb",
    name: "HappyDB",
    file: "/data/happydb.json.gz",
    description: "100,533 crowd-sourced happy moments from 100 countries (Asai et al., 2018).",
  },
];

const BATCH = 1000;
const clock = () => performance.now();

async function loadDataset(url: string): Promise<Dataset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // The file is gzip; some hosts already decompress it in transit.
  let text: string;
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(buf);
  }
  return JSON.parse(text) as Dataset;
}

export default function AdminPanel({
  initialCounts,
  initialIndicators,
}: {
  initialCounts: { source: string; n: number }[];
  initialIndicators: IndicatorMeta[];
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const say = (msg: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30));

  async function reloadCounts() {
    const { data } = await createClient().rpc("admin_source_counts");
    setCounts((data ?? []) as { source: string; n: number }[]);
  }

  async function importDataset(id: string, file: string) {
    setError(null);
    setBusy(id);
    const supabase = createClient();
    try {
      say(`Downloading ${file}…`);
      const data = await loadDataset(file);
      say(`Parsed ${data.rows.length.toLocaleString()} rows. Removing previous "${id}" rows…`);
      const { error: delErr } = await supabase.rpc("admin_delete_source", { p_source: id });
      if (delErr) throw delErr;

      const total = data.rows.length;
      setProgress({ done: 0, total });
      const started = clock();
      for (let i = 0; i < total; i += BATCH) {
        const chunk = data.rows.slice(i, i + BATCH);
        let attempt = 0;
        // retry each batch up to 3 times on transient network errors
        while (true) {
          const { error: insErr } = await supabase.rpc("admin_import_moments", { p_source: id, p_rows: chunk });
          if (!insErr) break;
          if (++attempt >= 3) throw insErr;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
        setProgress({ done: Math.min(i + BATCH, total), total });
      }
      const secs = ((clock() - started) / 1000).toFixed(1);
      say(`Inserted ${total.toLocaleString()} rows in ${secs}s. Refreshing statistics…`);
      const { error: refErr } = await supabase.rpc("refresh_stats");
      if (refErr) throw refErr;
      say("Statistics refreshed ✓");
      await reloadCounts();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Import failed";
      setError(msg);
      say(`Error: ${msg}`);
    } finally {
      setBusy(null);
    }
  }

  async function importIndicator(def: IndicatorDef) {
    setError(null);
    setBusy(def.code);
    const supabase = createClient();
    try {
      const url = `https://ourworldindata.org/grapher/${def.owidSlug}.csv?v=1&csvType=full&useColumnShortNames=true`;
      say(`Downloading ${def.name} from Our World in Data…`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const rows = owidCsvToRows(await res.text());
      if (rows.length === 0) throw new Error("No usable rows in the file");
      say(`Parsed ${rows.length.toLocaleString()} country-year values. Saving…`);
      const { data, error } = await supabase.rpc("admin_import_indicator", {
        p_code: def.code,
        p_meta: {
          name: def.name,
          unit: def.unit,
          description: def.description,
          source: def.source,
          source_url: def.sourceUrl,
        },
        p_rows: rows,
      });
      if (error) throw error;
      say(`${def.name}: saved ${Number(data).toLocaleString()} values ✓`);
      const { data: meta } = await supabase.from("indicators").select("code, min_year, max_year, updated_at");
      setIndicators((meta ?? []) as IndicatorMeta[]);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Import failed";
      setError(msg);
      say(`Error: ${msg}`);
    } finally {
      setBusy(null);
    }
  }

  async function removeSource(id: string) {
    setError(null);
    setBusy(`del-${id}`);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_delete_source", { p_source: id });
    if (error) setError(error.message);
    else {
      say(`Deleted ${Number(data).toLocaleString()} "${id}" rows`);
      await supabase.rpc("refresh_stats");
      await reloadCounts();
    }
    setBusy(null);
  }

  async function refresh() {
    setBusy("refresh");
    const { error } = await createClient().rpc("refresh_stats");
    if (error) setError(error.message);
    else say("Statistics refreshed ✓");
    setBusy(null);
  }

  const total = counts.reduce((s, c) => s + Number(c.n), 0);
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="flex items-center gap-3 text-3xl font-bold">
        <Database className="text-violet-mv" /> Admin · Data
      </h1>
      <p className="mt-1 text-white/60">Import open datasets that power the Humanity Map and Time Analytics.</p>

      <section className="glass mt-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Moments in database</h2>
          <button className="btn-ghost text-sm" onClick={refresh} disabled={!!busy}>
            <RefreshCw size={14} /> Refresh stats
          </button>
        </div>
        <p className="mt-2 text-4xl font-bold">{total.toLocaleString()}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {counts.length === 0 && <span className="text-white/50">No data yet.</span>}
          {counts.map((c) => (
            <span key={c.source} className="rounded-full bg-white/5 px-3 py-1">
              {c.source}: {Number(c.n).toLocaleString()}
            </span>
          ))}
        </div>
      </section>

      {DATASETS.map((d) => {
        const current = counts.find((c) => c.source === d.id);
        return (
          <section key={d.id} className="glass mt-6 p-6">
            <h2 className="text-lg font-semibold">{d.name}</h2>
            <p className="mt-1 text-sm text-white/60">{d.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => importDataset(d.id, d.file)} disabled={!!busy}>
                <Upload size={16} /> {current ? "Re-import" : "Import"}
              </button>
              {current && (
                <button className="btn-ghost text-red-300" onClick={() => removeSource(d.id)} disabled={!!busy}>
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>
            {busy === d.id && progress && (
              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="future-gradient h-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {progress.done.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)
                </p>
              </div>
            )}
          </section>
        );
      })}

      <h2 className="mt-10 flex items-center gap-2 text-xl font-semibold">
        <LineChart size={20} className="text-cyan-mv" /> Time Analytics indicators
      </h2>
      <p className="mt-1 text-sm text-white/60">Multi-year values by country, downloaded live from Our World in Data.</p>
      {INDICATORS.map((def) => {
        const meta = indicators.find((i) => i.code === def.code);
        return (
          <section key={def.code} className="glass mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h3 className="font-semibold">{def.name}</h3>
              <p className="text-xs text-white/50">{def.source}</p>
              <p className="mt-1 text-sm text-white/70">
                {meta ? `Loaded: ${meta.min_year}–${meta.max_year}` : "Not loaded yet"}
              </p>
            </div>
            <button className="btn-primary" onClick={() => importIndicator(def)} disabled={!!busy}>
              <Upload size={16} /> {busy === def.code ? "Importing…" : meta ? "Update" : "Import"}
            </button>
          </section>
        );
      })}

      {error && <p className="mt-6 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}

      {log.length > 0 && (
        <pre className="glass mt-6 max-h-64 overflow-auto p-4 text-xs text-white/70">{log.join("\n")}</pre>
      )}
    </div>
  );
}
