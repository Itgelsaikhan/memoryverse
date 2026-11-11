import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import AdminPanel, { type IndicatorMeta } from "./AdminPanel";

export const metadata = { title: "Admin · MemoryVerse" };

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: counts }, { data: indicators }] = await Promise.all([
    supabase.rpc("admin_source_counts"),
    supabase.from("indicators").select("code, min_year, max_year, updated_at"),
  ]);
  return (
    <AdminPanel
      initialCounts={(counts ?? []) as { source: string; n: number }[]}
      initialIndicators={(indicators ?? []) as IndicatorMeta[]}
    />
  );
}
