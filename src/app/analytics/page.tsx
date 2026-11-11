import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import AnalyticsDashboard, { type AnalyticsData } from "./AnalyticsDashboard";

export const metadata = { title: "Time Analytics · MemoryVerse" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}

async function AnalyticsContent() {
  const empty: AnalyticsData = { indicators: [], ageTopics: [], totalMoments: 0, countries: 0, myEmotions: null };
  if (!isSupabaseConfigured) return <AnalyticsDashboard data={empty} />;

  const supabase = await createClient();
  const [{ data: indicators }, { data: ageTopics }, { data: countryStats }, { data: auth }] = await Promise.all([
    supabase.from("indicators").select("code, name, min_year, max_year"),
    supabase.from("age_topic_stats").select("age_group, topic, n"),
    supabase.from("country_stats").select("total"),
    supabase.auth.getUser(),
  ]);

  let myEmotions: Record<string, number> | null = null;
  if (auth.user) {
    const { data: mine } = await supabase.rpc("list_my_capsules", { p_kind: "memory" });
    myEmotions = {};
    for (const c of (mine ?? []) as { emotion: string | null }[]) {
      const k = c.emotion ?? "unspecified";
      myEmotions[k] = (myEmotions[k] ?? 0) + 1;
    }
  }

  return (
    <AnalyticsDashboard
      data={{
        indicators: (indicators ?? []) as AnalyticsData["indicators"],
        ageTopics: (ageTopics ?? []) as AnalyticsData["ageTopics"],
        totalMoments: (countryStats ?? []).reduce((s, r) => s + (r as { total: number }).total, 0),
        countries: (countryStats ?? []).length,
        myEmotions,
      }}
    />
  );
}
