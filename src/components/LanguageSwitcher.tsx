"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const LABELS: Record<Locale, string> = { en: "EN", mn: "МН" };
const NAMES: Record<Locale, string> = { en: "English", mn: "Монгол" };

/** Remember the choice for a year; the server reads it on every request. */
function saveLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

export default function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    saveLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={`flex overflow-hidden rounded-lg border border-white/15 text-xs ${pending ? "opacity-60" : ""}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          title={NAMES[l]}
          className={`px-2 py-1 ${l === locale ? "bg-white/15 font-semibold text-white" : "text-white/60 hover:text-white"}`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
