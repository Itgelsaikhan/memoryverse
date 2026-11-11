import { BarChart3 } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Time Analytics · MemoryVerse" };

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      week="IN DEVELOPMENT"
      title="Time Analytics"
      text="How humanity's dreams and values change across years and countries."
      bullets={[
        "Dream topics over time (1990 → today)",
        "Compare happiness and values across countries",
        "Emotion heatmaps by month",
        "Your personal Year in Review",
      ]}
    />
  );
}
