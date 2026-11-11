import Link from "next/link";
import { Lock, MapPin, Mic, Video } from "lucide-react";
import {
  type Capsule,
  emotionOf,
  formatDate,
  isAudio,
  isImage,
  isVideo,
  timeUntil,
} from "@/lib/capsules";

export default function CapsuleCard({ capsule, url }: { capsule: Capsule; url?: string }) {
  const emotion = emotionOf(capsule.emotion);

  if (capsule.is_sealed) {
    return (
      <div className="glass relative overflow-hidden p-5">
        <div className="future-gradient absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-30 blur-2xl" />
        <Lock className="text-cyan-mv" size={22} />
        <h3 className="mt-3 font-semibold">{capsule.title}</h3>
        <p className="text-future mt-1 text-sm font-medium">{timeUntil(capsule.unlock_at!)}</p>
        <p className="mt-3 text-xs text-white/40">
          Sealed {formatDate(capsule.created_at)} · opens {formatDate(capsule.unlock_at)}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/capsule/${capsule.id}`}
      className="glass block overflow-hidden transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
    >
      {url && isImage(capsule.media_path) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={capsule.title} className="h-44 w-full object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>{formatDate(capsule.memory_date ?? capsule.created_at)}</span>
          {emotion && (
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: `${emotion.color}22`, color: emotion.color }}
            >
              {emotion.emoji} {emotion.label}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold">{capsule.title}</h3>
        {capsule.body && <p className="mt-2 line-clamp-3 text-sm text-white/65">{capsule.body}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
          {capsule.location_name && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {capsule.location_name}
            </span>
          )}
          {isAudio(capsule.media_path) && (
            <span className="inline-flex items-center gap-1">
              <Mic size={12} /> Voice
            </span>
          )}
          {isVideo(capsule.media_path) && (
            <span className="inline-flex items-center gap-1">
              <Video size={12} /> Video
            </span>
          )}
          {capsule.kind === "future" && <span className="text-cyan-mv">Opened capsule</span>}
        </div>
      </div>
    </Link>
  );
}
