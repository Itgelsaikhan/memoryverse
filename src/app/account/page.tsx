import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import type { MyPlan } from "@/lib/plans";
import AccountView, { type Contact, type Payment } from "./AccountView";

export const metadata = { title: "Account · MemoryVerse" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: plan }, { data: payments }, { data: contacts }, { data: auth }] = await Promise.all([
    supabase.rpc("my_plan").maybeSingle(),
    supabase.from("payments").select("id, plan, period, amount_cents, currency, provider, status, created_at").order("created_at", { ascending: false }),
    supabase.from("legacy_contacts").select("id, name, email, relationship").order("created_at"),
    supabase.auth.getUser(),
  ]);

  return (
    <AccountView
      email={auth.user?.email ?? ""}
      plan={plan as MyPlan | null}
      payments={(payments ?? []) as Payment[]}
      contacts={(contacts ?? []) as Contact[]}
      justUpgraded={sp.upgraded === "1"}
    />
  );
}
