"use client";

import { useI18n } from "@/i18n/client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl">☄️</p>
      <h1 className="mt-4 text-2xl font-bold">{t.error.title}</h1>
      <p className="mt-2 text-white/60">{t.error.text}</p>
      <button onClick={reset} className="btn-primary mt-6">
        {t.common.tryAgain}
      </button>
    </div>
  );
}
