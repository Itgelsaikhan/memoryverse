export type CountryStats = {
  country: string;
  total: number;
  joy: number;
  love: number;
  pride: number;
  calm: number;
  nostalgia: number;
  hope: number;
  sadness: number;
  fear: number;
  top_emotion: string | null;
  top_topic: string | null;
};

export const STAT_EMOTIONS = ["joy", "love", "pride", "calm", "nostalgia", "hope", "sadness", "fear"] as const;
export type StatEmotion = (typeof STAT_EMOTIONS)[number];

export const TOPIC_LABELS: Record<string, string> = {
  affection: "Affection & family",
  achievement: "Achievement",
  enjoy_the_moment: "Enjoying the moment",
  bonding: "Friends & bonding",
  leisure: "Leisure",
  nature: "Nature",
  exercise: "Exercise",
};

export function topicLabel(t: string | null | undefined) {
  if (!t) return "—";
  return TOPIC_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1);
}

/** Below this many moments a country's numbers are shown as a small sample. */
export const MIN_SAMPLE = 30;
