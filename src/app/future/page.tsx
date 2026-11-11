import { Suspense } from "react";
import Link from "next/link";
import PageSkeleton from "@/components/PageSkeleton";
import { Hourglass, Plus } from "lucide-react";
import CapsuleCard from "@/components/CapsuleCard";
import { getMyCapsules } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { Countdown, LocalDate } from "@/components/LocalTime";

export const metadata = { title: "Future Capsules · MemoryVerse" };

export default function FuturePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FuturePageContent />
    </Suspense>
  );
}

async function FuturePageContent() {
  const [{ capsules, urls }, { t }] = await Promise.all([getMyCapsules("future"), getI18n()]);
  const sealed = capsules
    .filter((c) => c.is_sealed)
    .sort((a, b) => +new Date(a.unlock_at!) - +new Date(b.unlock_at!));
  const opened = capsules.filter((c) => !c.is_sealed);
  const nextUp = sealed[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.future.title}</h1>
          <p className="mt-1 text-white/60">{t.future.subtitle}</p>
        </div>
        <Link href="/new?kind=future" className="btn-primary">
          <Plus size={16} /> {t.future.sealNew}
        </Link>
      </div>

      {nextUp && (
        <div className="glass relative mt-8 overflow-hidden p-8">
          <div className="future-gradient absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-25 blur-3xl" />
          <p className="text-sm text-white/50">{t.future.nextToOpen}</p>
          <h2 className="mt-1 text-2xl font-bold">{nextUp.title}</h2>
          <p className="text-future mt-3 text-4xl font-bold"><Countdown iso={nextUp.unlock_at!} /></p>
          <p className="mt-2 text-sm text-white/50">
            {t.future.sealedOn} <LocalDate iso={nextUp.created_at} /> · {t.future.opens} <LocalDate iso={nextUp.unlock_at} />
          </p>
        </div>
      )}

      {capsules.length === 0 && (
        <div className="glass mt-10 p-12 text-center">
          <Hourglass className="mx-auto text-cyan-mv" size={40} />
          <h2 className="mt-4 text-xl font-semibold">{t.future.emptyTitle}</h2>
          <p className="mt-2 text-white/60">{t.future.emptyText}</p>
        </div>
      )}

      {sealed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-cyan-mv">{t.future.sealed}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sealed.map((c) => (
              <CapsuleCard key={c.id} capsule={c} />
            ))}
          </div>
        </section>
      )}

      {opened.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-amber-mv">{t.future.opened}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opened.map((c) => (
              <CapsuleCard key={c.id} capsule={c} url={c.media_path ? urls[c.media_path] : undefined} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
