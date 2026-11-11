import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import SetupNotice from "@/components/SetupNotice";
import PageSkeleton from "@/components/PageSkeleton";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export const metadata: Metadata = {
  title: "MemoryVerse – A Digital Universe of Memories",
  description:
    "Save your memories, seal letters to your future self, and see how humanity's dreams change over time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {/* The language comes from a cookie, so the shell renders per request */}
        <Suspense fallback={<PageSkeleton />}>
          <LocaleShell>{children}</LocaleShell>
        </Suspense>
      </body>
    </html>
  );
}

async function LocaleShell({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <I18nProvider locale={locale}>
      <SetupNotice text={t.setupNotice} />
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
        © MemoryVerse · {t.footer}
      </footer>
    </I18nProvider>
  );
}
