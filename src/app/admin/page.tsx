import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import AdminPanel from "./AdminPanel";

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

  const { data: counts } = await supabase.rpc("admin_source_counts");
  return <AdminPanel initialCounts={(counts ?? []) as { source: string; n: number }[]} />;
}
