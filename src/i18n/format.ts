import { INTL_LOCALE, type Locale } from "./config";

/**
 * Formats a calendar date. Mongolian is formatted by hand ("2026 оны 11-р сарын 11") because Chrome
 * ships without Mongolian locale data and would silently fall back to English.
 * Pass utc=true for date-only values (e.g. "2024-07-15") so they never shift by a day.
 */
export function formatDate(date: Date, locale: Locale, utc = false) {
  if (locale === "mn") {
    const y = utc ? date.getUTCFullYear() : date.getFullYear();
    const m = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
    const d = utc ? date.getUTCDate() : date.getDate();
    return `${y} оны ${m}-р сарын ${d}`;
  }
  return date.toLocaleDateString(INTL_LOCALE[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(utc ? { timeZone: "UTC" } : {}),
  });
}
