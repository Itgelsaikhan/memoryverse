"use client";

import { useRef, useState } from "react";

export type LineSeries = {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: { x: number; y: number }[];
};

const W = 760;
const H = 320;
const PAD = { top: 16, right: 120, bottom: 30, left: 48 };

function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? step0;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

export default function LineChart({
  series,
  format,
  ariaLabel,
}: {
  series: LineSeries[];
  format: (v: number) => string;
  ariaLabel: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const all = series.flatMap((s) => s.points);
  const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);

  if (all.length === 0) {
    return <p className="py-16 text-center text-sm text-white/50">No data for this selection.</p>;
  }

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yLo = Math.min(...all.map((p) => p.y));
  const yHi = Math.max(...all.map((p) => p.y));
  const yPad = (yHi - yLo || 1) * 0.12;
  const yTicks = niceTicks(yLo - yPad, yHi + yPad, 5);
  const y0 = yTicks[0];
  const y1 = yTicks[yTicks.length - 1];

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => PAD.top + (1 - (y - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);

  const xStep = Math.max(1, Math.ceil((xMax - xMin) / 7));
  const xTicks: number[] = [];
  for (let x = xMin; x <= xMax; x += xStep) xTicks.push(x);

  // End-of-line labels, nudged apart so they never overlap
  const ends = series
    .filter((s) => s.points.length)
    .map((s) => {
      const last = s.points[s.points.length - 1];
      return { id: s.id, label: s.label, color: s.color, y: sy(last.y), x: sx(last.x) };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  }

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = xs[0];
    for (const x of xs) if (Math.abs(sx(x) - px) < Math.abs(sx(best) - px)) best = x;
    setHoverX(best);
  }

  const hoverRows =
    hoverX === null
      ? []
      : series
          .map((s) => ({ s, p: s.points.find((p) => p.x === hoverX) }))
          .filter((r): r is { s: LineSeries; p: { x: number; y: number } } => !!r.p)
          .sort((a, b) => b.p.y - a.p.y);
  const tipLeftPct = hoverX === null ? 0 : (sx(hoverX) / W) * 100;

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
        {series.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
            </svg>
            {s.label}
          </span>
        ))}
        <button className="ml-auto text-white/50 underline-offset-2 hover:underline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-80 overflow-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-space-900 text-white/60">
              <tr>
                <th className="px-3 py-2">Year</th>
                {series.map((s) => (
                  <th key={s.id} className="px-3 py-2">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((x) => (
                <tr key={x} className="border-t border-white/5">
                  <td className="px-3 py-1.5 text-white/60">{x}</td>
                  {series.map((s) => {
                    const p = s.points.find((q) => q.x === x);
                    return (
                      <td key={s.id} className="px-3 py-1.5">
                        {p ? format(p.y) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
            {/* grid + y axis */}
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.07)" />
                <text x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="rgba(255,255,255,0.45)">
                  {format(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={sx(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.45)">
                {t}
              </text>
            ))}

            {/* lines */}
            {series.map((s) => {
              if (s.points.length === 0) return null;
              const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
              const sparse = s.points.length < 2 || (xMax - xMin) / s.points.length > 2;
              return (
                <g key={s.id}>
                  <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "6 4" : undefined} />
                  {sparse &&
                    s.points.map((p) => (
                      <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="4" fill={s.color} stroke="#0e1330" strokeWidth="2" />
                    ))}
                </g>
              );
            })}

            {/* end labels */}
            {ends.map((e) => (
              <g key={e.id}>
                <circle cx={W - PAD.right + 10} cy={e.y} r="3.5" fill={e.color} />
                <text x={W - PAD.right + 18} y={e.y} dominantBaseline="middle" fontSize="11" fill="rgba(255,255,255,0.75)">
                  {e.label.length > 16 ? `${e.label.slice(0, 15)}…` : e.label}
                </text>
              </g>
            ))}

            {/* crosshair */}
            {hoverX !== null && (
              <g pointerEvents="none">
                <line x1={sx(hoverX)} x2={sx(hoverX)} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.35)" />
                {hoverRows.map(({ s, p }) => (
                  <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r="5" fill={s.color} stroke="#0e1330" strokeWidth="2" />
                ))}
              </g>
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={W - PAD.left - PAD.right}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHoverX(null)}
            />
          </svg>

          {hoverX !== null && hoverRows.length > 0 && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-white/10 bg-space-900/95 p-3 text-xs shadow-xl"
              style={{
                left: `${tipLeftPct}%`,
                transform: tipLeftPct > 55 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
              }}
            >
              <p className="mb-1 font-semibold">{hoverX}</p>
              {hoverRows.map(({ s, p }) => (
                <p key={s.id} className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-white/70">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-medium">{format(p.y)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
