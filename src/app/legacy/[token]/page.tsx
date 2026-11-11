import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HeartHandshake, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import { LocalDate } from "@/components/LocalTime";
import { emotionOf, formatDay } from "@/lib/capsules";
import { getI18n } from "@/i18n/server";

export const metadata = { title: "A gift of memories · MemoryVerse", robots: { index: false } };

type LegacyCapsule = {
  title: string;
  body: string | null;
  emotion: string | null;
  memory_date: string | null;
  location: string | null;
  created_at: string;
  kind: string;
  epilogue: string | null;
  has_media: boolean;
};
type LegacyView = { kind: "preview" | "delivery"; from: string | null; to: string | null; capsules: LegacyCapsule[] };

export default function LegacyPage({ params }: PageProps<"/legacy/[token]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LegacyContent params={params} />
    </Suspense>
  );
}

async function LegacyContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const [supabase, { t, locale }] = await Promise.all([createClient(), getI18n()]);
  const tl = t.legacy;
  const { data } = await supabase.rpc("legacy_view", { p_token: token });
  const view = data as LegacyView | null;
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {view.kind === "preview" && (
        <p className="mb-6 rounded-xl border border-amber-mv/40 bg-amber-mv/10 p-3 text-center text-sm text-amber-mv">
          {tl.previewBanner}
        </p>
      )}
      <div className="glass p-8 text-center">
        <HeartHandshake className="mx-auto text-pink-400" size={40} />
        <h1 className="mt-4 text-3xl font-bold">
          {tl.title(view.to, view.from ?? tl.someone)}
        </h1>
        <p className="mt-2 text-white/60">
          {tl.count(view.capsules.length)}
        </p>
      </div>

      {view.capsules.length === 0 && (
        <p className="glass mt-8 p-6 text-center text-sm text-white/55">
          {view.kind === "preview"
            ? tl.emptyPreview
            : tl.empty}
        </p>
      )}

      <ol className="relative mt-10 space-y-6 border-l border-white/10 pl-6">
        {view.capsules.map((c, i) => {
          const em = emotionOf(c.emotion);
          return (
            <li key={i} className="glass p-6">
              <span className="absolute -left-[5px] mt-2 h-2.5 w-2.5 rounded-full bg-amber-mv" />
              <p className="text-xs text-white/50">
                {c.memory_date ? formatDay(c.memory_date, locale) : <LocalDate iso={c.created_at} />}
                {em && (
                  <span className="ml-2" style={{ color: em.color }}>
                    {em.emoji} {t.emotions[em.id]}
                  </span>
                )}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{c.title}</h2>
              {c.location && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/50">
                  <MapPin size={12} /> {c.location}
                </p>
              )}
              {c.body && <p className="mt-3 whitespace-pre-wrap text-white/80">{c.body}</p>}
              {c.epilogue && (
                <p className="mt-3 border-l-2 border-cyan-mv/50 pl-3 text-sm text-white/65 italic">{tl.later} {c.epilogue}</p>
              )}
              {c.has_media && <p className="mt-3 text-xs text-white/40">{tl.hasMedia}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
