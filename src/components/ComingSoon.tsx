import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  title,
  text,
  week,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  week: string;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="glass relative overflow-hidden p-10">
        <div className="future-gradient absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl" />
        <Icon size={40} className="text-violet-mv" />
        <p className="mt-6 text-xs tracking-widest text-cyan-mv">{week}</p>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-white/65">{text}</p>
        <ul className="mt-6 space-y-2 text-sm text-white/70">
          {bullets.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
        <Link href="/new" className="btn-primary mt-8">
          Add a capsule meanwhile
        </Link>
      </div>
    </div>
  );
}
