import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header, { HeaderFallback } from "@/components/Header";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = {
  title: "MemoryVerse – A Digital Universe of Memories",
  description:
    "Save your memories, seal letters to your future self, and see how humanity's dreams change over time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SetupNotice />
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
          © MemoryVerse · Every memory is a star.
        </footer>
      </body>
    </html>
  );
}
