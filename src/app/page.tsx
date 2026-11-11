import Link from "next/link";
import { Archive, BarChart3, Globe2, Hourglass, Lock, ArrowRight } from "lucide-react";
import { getI18n } from "@/i18n/server";

const FEATURES = [
  { icon: Archive, href: "/vault", accent: "text-amber-mv" },
  { icon: Hourglass, href: "/future", accent: "text-cyan-mv" },
  { icon: Globe2, href: "/map", accent: "text-violet-mv" },
  { icon: BarChart3, href: "/analytics", accent: "text-pink-400" },
];

const ORBIT = [
  { emoji: "📷", style: "top-[8%] left-[18%]" },
  { emoji: "🎙️", style: "top-[22%] right-[6%]" },
  { emoji: "✉️", style: "bottom-[14%] left-[6%]" },
  { emoji: "🌅", style: "bottom-[6%] right-[22%]" },
  { emoji: "✨", style: "top-[50%] -left-[2%]" },
];

export default async function Home() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
            <Lock size={12} /> {t.home.badge}
          </p>
          <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-6xl">
            {t.home.title1}
            <br />
            <span className="text-future">{t.home.title2}</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-white/65">
            {t.home.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/new" className="btn-primary">
              {t.home.ctaCreate} <ArrowRight size={16} />
            </Link>
            <Link href="/map" className="btn-ghost">
              {t.home.ctaMap}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-violet-mv/50 via-cyan-mv/20 to-amber-mv/30 blur-2xl" />
          <div className="glass absolute inset-[24%] grid place-items-center rounded-full! shadow-[0_0_80px_rgba(139,92,246,0.35)]">
            <Hourglass size={64} className="text-white/80" />
          </div>
          <div className="absolute inset-[6%] rounded-full border border-dashed border-white/10" />
          {ORBIT.map((o) => (
            <span
              key={o.style}
              className={`glass absolute grid h-14 w-14 place-items-center text-2xl ${o.style}`}
            >
              {o.emoji}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Link key={f.href} href={f.href} className="glass p-6 transition hover:bg-white/[0.07]">
            <f.icon className={f.accent} size={28} />
            <h3 className="mt-4 font-semibold">{t.home.features[i].title}</h3>
            <p className="mt-2 text-sm text-white/60">{t.home.features[i].text}</p>
          </Link>
        ))}
      </section>

      <section className="glass mb-20 grid gap-6 p-8 text-center sm:grid-cols-3">
        <div>
          <div className="text-3xl font-bold text-amber-mv">1</div>
          <div className="mt-1 text-sm text-white/60">{t.home.steps[0]}</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-violet-mv">2</div>
          <div className="mt-1 text-sm text-white/60">{t.home.steps[1]}</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-cyan-mv">3</div>
          <div className="mt-1 text-sm text-white/60">{t.home.steps[2]}</div>
        </div>
      </section>
    </div>
  );
}
