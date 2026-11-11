import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { CountryStats } from "@/lib/stats";
import HumanityMap from "./HumanityMap";

export const metadata = { title: "Humanity Map · MemoryVerse" };

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-4rem)] animate-pulse bg-white/[0.02]" />}>
      <MapContent />
    </Suspense>
  );
}

async function MapContent() {
  let stats: CountryStats[] = [];
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("country_stats").select("*");
    stats = (data ?? []) as CountryStats[];
  }
  return <HumanityMap stats={stats} />;
}
