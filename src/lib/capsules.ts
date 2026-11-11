export type CapsuleKind = "memory" | "future";

export type Capsule = {
  id: string;
  kind: CapsuleKind;
  title: string;
  body: string | null;
  emotion: string | null;
  topic: string | null;
  memory_date: string | null;
  location_name: string | null;
  media_path: string | null;
  is_public: boolean;
  unlock_at: string | null;
  epilogue: string | null;
  created_at: string;
  is_sealed: boolean;
};

export const EMOTIONS = [
  { id: "joy", label: "Joy", emoji: "😊", color: "#F5B544" },
  { id: "love", label: "Love", emoji: "💗", color: "#F472B6" },
  { id: "nostalgia", label: "Nostalgia", emoji: "🌅", color: "#FB923C" },
  { id: "hope", label: "Hope", emoji: "✨", color: "#A78BFA" },
  { id: "pride", label: "Pride", emoji: "🏆", color: "#34D399" },
  { id: "calm", label: "Calm", emoji: "🌿", color: "#22D3EE" },
  { id: "sadness", label: "Sadness", emoji: "🌧️", color: "#60A5FA" },
  { id: "fear", label: "Fear", emoji: "🌪️", color: "#94A3B8" },
] as const;

export function emotionOf(id: string | null) {
  return EMOTIONS.find((e) => e.id === id) ?? null;
}

export function timeUntil(iso: string, now = new Date()) {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "Opened";
  const days = Math.floor(ms / 86_400_000);
  const years = Math.floor(days / 365);
  const rest = days % 365;
  if (years > 0) return `Opens in ${years}y ${rest}d`;
  if (days > 0) return `Opens in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `Opens in ${hours} hour${hours === 1 ? "" : "s"}`;
}

export function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isImage(path: string | null) {
  return !!path && /\.(png|jpe?g|gif|webp|avif)$/i.test(path);
}
export function isAudio(path: string | null) {
  return !!path && /\.(mp3|wav|m4a|ogg|webm)$/i.test(path);
}
export function isVideo(path: string | null) {
  return !!path && /\.(mp4|mov)$/i.test(path);
}
