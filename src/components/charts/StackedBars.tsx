"use client";

import { useState } from "react";

export type StackSegment = { key: string; label: string; color: string };
export type StackRow = { label: string; values: Record<string, number> };

/** 100% horizontal stacked bars with a hover tooltip and a table view. */
export default function StackedBars({
  rows,
  segments,
  ariaLabel,
  unitLabel = "moments",
}: {
  rows: StackRow[];
  segments: StackSegment[];
  ariaLabel: string;
  unitLabel?: string;
}) {
  const [hover, setHover] = useState<{ row: string; seg: string; x: number } | null>(null);
  const [showTable, setShowTable] = useState(false);

  const totals = rows.map((r) => segments.reduce((s, seg) => s + (r.values[seg.key] ?? 0), 0));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <button className="ml-auto text-white/50 underline-offset-2 hover:underline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="px-3 py-2">Group</th>
                {segments.map((s) => (
                  <th key={s.key} className="px-3 py-2">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className="border-t border-white/5">
                  <td className="px-3 py-1.5 text-white/60">{r.label}</td>
                  {segments.map((s) => (
                    <td key={s.key} className="px-3 py-1.5">
                      {totals[i] ? (((r.values[s.key] ?? 0) / totals[i]) * 100).toFixed(1) : "0.0"}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative space-y-3" role="img" aria-label={ariaLabel}>
          {rows.map((r, i) => {
            let acc = 0;
            return (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-right text-xs text-white/60">{r.label}</span>
                <div className="flex h-7 flex-1 gap-[2px]" onPointerLeave={() => setHover(null)}>
                  {segments.map((s) => {
                    const v = r.values[s.key] ?? 0;
                    if (!v || !totals[i]) return null;
                    const pct = (v / totals[i]) * 100;
                    const start = acc;
                    acc += pct;
                    const active = hover?.row === r.label && hover?.seg === s.key;
                    return (
                      <div
                        key={s.key}
                        className="h-full transition-opacity first:rounded-l last:rounded-r"
                        style={{
                          width: `${pct}%`,
                          background: s.color,
                          opacity: hover && !active ? 0.55 : 1,
                        }}
                        onPointerEnter={() => setHover({ row: r.label, seg: s.key, x: start + pct / 2 })}
                      />
                    );
                  })}
                </div>
                <span className="w-16 shrink-0 text-xs text-white/40">{totals[i].toLocaleString()}</span>
              </div>
            );
          })}

          {hover &&
            (() => {
              const i = rows.findIndex((r) => r.label === hover.row);
              const seg = segments.find((s) => s.key === hover.seg)!;
              const v = rows[i].values[hover.seg] ?? 0;
              return (
                <div
                  className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-space-900/95 px-3 py-2 text-xs shadow-xl"
                  style={{ top: i * 40 - 44, left: `calc(4.25rem + (100% - 9.5rem) * ${hover.x / 100})`, transform: "translateX(-50%)" }}
                >
                  <p className="font-semibold">Age {hover.row}</p>
                  <p className="flex items-center gap-1.5 text-white/70">
                    <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                    {seg.label}: <span className="font-medium text-white">{((v / totals[i]) * 100).toFixed(1)}%</span>
                  </p>
                  <p className="text-white/45">
                    {v.toLocaleString()} {unitLabel}
                  </p>
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
}
