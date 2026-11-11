import Link from "next/link";
import { Sparkles } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/vault", label: "Vault" },
  { href: "/future", label: "Future" },
  { href: "/map", label: "Humanity Map" },
  { href: "/analytics", label: "Analytics" },
];

export function HeaderFallback() {
  return <HeaderView email={null} pending />;
}

export default async function Header() {
  let email: string | null = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  }
  return <HeaderView email={email} />;
}

function HeaderView({ email, pending = false }: { email: string | null; pending?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-space-950/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="future-gradient grid h-8 w-8 place-items-center rounded-full">
            <Sparkles size={16} className="text-white" />
          </span>
          MemoryVerse
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {pending ? (
            <span className="h-9 w-24 animate-pulse rounded-xl bg-white/5" />
          ) : email ? (
            <>
              <span className="hidden text-white/50 sm:inline">{email}</span>
              <form action="/auth/signout" method="post">
                <button className="btn-ghost text-sm">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-white/80 hover:text-white sm:inline">
                Log in
              </Link>
              <Link href="/login?mode=signup" className="btn-primary text-sm">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex justify-around border-t border-white/5 py-2 text-xs text-white/70 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
