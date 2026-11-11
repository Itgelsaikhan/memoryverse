"use client";

import { useSyncExternalStore } from "react";
import { formatDate } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import en, { type Dictionary } from "@/i18n/dictionaries/en";

const noop = () => () => {};
// true in the browser, false during server render — avoids hydration mismatches
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Shows a date in the viewer's own time zone and language. */
export function LocalDate({ iso }: { iso: string | null }) {
  const isClient = useIsClient();
  const { locale } = useI18n();
  if (!iso) return null;
  if (!isClient) return <span className="inline-block min-w-20 opacity-0">…</span>;
  return (
    <time dateTime={iso}>
      {formatDate(new Date(iso), locale)}
    </time>
  );
}

export function countdownText(iso: string, now = new Date(), t: Dictionary = en) {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return t.time.opened;
  if (ms < 86_400_000) return t.time.inHours(Math.max(1, Math.ceil(ms / 3_600_000)));
  const days = Math.ceil(ms / 86_400_000);
  return t.time.inDuration(Math.floor(days / 365), days % 365);
}

/** "Opens in 1 year 12 days", computed in the viewer's browser. */
export function Countdown({ iso }: { iso: string }) {
  const isClient = useIsClient();
  const { t } = useI18n();
  if (!isClient) return <span className="opacity-0">…</span>;
  return <>{countdownText(iso, new Date(), t)}</>;
}
