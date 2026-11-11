import { Globe2 } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Humanity Map · MemoryVerse" };

export default function MapPage() {
  return (
    <ComingSoon
      icon={Globe2}
      week="IN DEVELOPMENT"
      title="Humanity Map"
      text="Anonymous memories and dreams from around the world, grouped into hexagons and colored by emotion."
      bullets={[
        "100,000+ real data points from open datasets",
        "Filters by emotion, topic and year",
        "Live updates as new capsules are shared",
        "City-level privacy — exact locations are never shown",
      ]}
    />
  );
}
