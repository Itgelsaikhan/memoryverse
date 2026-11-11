import Link from "next/link";
import { Sparkles } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function Header() {
  const { t } = await getI18n();
  let email: string | null = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
    // Legacy relies on knowing when the user was last active (the database writes at most once per hour)
    if (data.user) await supabase.rpc("touch_last_seen");
  }

  const nav = [
    { href: "/vault", label: t.nav.vault },
    { href: "/future", label: t.nav.future },
    { href: "/map", label: t.nav.map },
    { href: "/analytics", label: t.nav.analytics },
    { href: "/pricing", label: t.nav.pricing },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-space-950/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="future-gradient grid h-8 w-8 place-items-center rounded-full">
            <Sparkles size={16} className="text-white" />
          </span>
          <span className="hidden sm:inline">MemoryVerse</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          {email ? (
            <>
              <Link href="/account" className="hidden max-w-44 truncate text-white/60 hover:text-white xl:inline">
                {email}
              </Link>
              <Link href="/account" className="whitespace-nowrap text-white/70 hover:text-white xl:hidden">
                {t.nav.account}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="btn-ghost text-sm whitespace-nowrap">{t.nav.logout}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden whitespace-nowrap text-white/80 hover:text-white sm:inline">
                {t.nav.login}
              </Link>
              <Link href="/login?mode=signup" className="btn-primary text-sm whitespace-nowrap">
                {t.nav.startFree}
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto border-t border-white/5 px-4 py-2 text-xs whitespace-nowrap text-white/70 md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
