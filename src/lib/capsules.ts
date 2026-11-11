import type { Locale } from "@/i18n/config";
import { formatDate } from "@/i18n/format";

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

/** Formats a date-only value like "2024-07-15" without time-zone shifting. */
export function formatDay(ymd: string, locale: Locale = "en") {
  const [y, m, d] = ymd.split("-").map(Number);
  return formatDate(new Date(Date.UTC(y, m - 1, d)), locale, true);
}

/** YYYY-MM-DD in the browser's local time zone. */
export function localYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
