"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
// true in the browser, false during server render — avoids hydration mismatches
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Shows a date in the viewer's own time zone. */
export function LocalDate({ iso }: { iso: string | null }) {
  const isClient = useIsClient();
  if (!iso) return null;
  if (!isClient) return <span className="inline-block min-w-20 opacity-0">…</span>;
  return (
    <time dateTime={iso}>
      {new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
    </time>
  );
}

export function countdownText(iso: string, now = new Date()) {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "Opened";
  if (ms < 86_400_000) {
    const hours = Math.max(1, Math.ceil(ms / 3_600_000));
    return `Opens in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.ceil(ms / 86_400_000);
  const years = Math.floor(days / 365);
  const rest = days % 365;
  const parts: string[] = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (rest) parts.push(`${rest} day${rest === 1 ? "" : "s"}`);
  return `Opens in ${parts.join(" ")}`;
}

/** "Opens in 1 year 12 days", computed in the viewer's browser. */
export function Countdown({ iso }: { iso: string }) {
  const isClient = useIsClient();
  if (!isClient) return <span className="opacity-0">Opens in …</span>;
  return <>{countdownText(iso)}</>;
}
