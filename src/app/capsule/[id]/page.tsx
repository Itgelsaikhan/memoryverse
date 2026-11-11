import { Suspense } from "react";
import Link from "next/link";
import PageSkeleton from "@/components/PageSkeleton";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { emotionOf, formatDay, isAudio, isImage, isVideo } from "@/lib/capsules";
import { LocalDate } from "@/components/LocalTime";
import EpilogueForm from "./EpilogueForm";
import DeleteButton from "./DeleteButton";

export default function CapsulePage({ params }: PageProps<"/capsule/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CapsuleContent params={params} />
    </Suspense>
  );
}

async function CapsuleContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  // RLS only returns the capsule if it belongs to the user and is not sealed
  const { data: capsule } = await supabase.from("capsules").select("*").eq("id", id).maybeSingle();
  if (!capsule) notFound();

  let mediaUrl: string | null = null;
  if (capsule.media_path) {
    const { data } = await supabase.storage.from("media").createSignedUrl(capsule.media_path, 3600);
    mediaUrl = data?.signedUrl ?? null;
  }
  const emotion = emotionOf(capsule.emotion);
  const isFuture = capsule.kind === "future";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={isFuture ? "/future" : "/vault"} className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ArrowLeft size={14} /> Back
      </Link>

      {isFuture && (
        <div className="future-gradient mt-6 rounded-2xl p-4 text-center font-medium text-white">
          ✨ Your capsule from <LocalDate iso={capsule.created_at} /> has opened
        </div>
      )}

      <div className={`mt-6 grid gap-6 ${isFuture ? "md:grid-cols-2" : ""}`}>
        <article className="glass overflow-hidden">
          {mediaUrl && isImage(capsule.media_path) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt={capsule.title} className="max-h-[480px] w-full object-cover" />
          )}
          <div className="p-6">
            {isFuture && <p className="text-xs tracking-widest text-amber-mv">THEN — <LocalDate iso={capsule.created_at} /></p>}
            <h1 className="mt-1 text-3xl font-bold">{capsule.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/55">
              {!isFuture && <span>{capsule.memory_date ? formatDay(capsule.memory_date) : <LocalDate iso={capsule.created_at} />}</span>}
              {capsule.location_name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {capsule.location_name}
                </span>
              )}
              {emotion && (
                <span style={{ color: emotion.color }}>
                  {emotion.emoji} {emotion.label}
                </span>
              )}
              {capsule.topic && <span>#{capsule.topic}</span>}
            </div>
            {mediaUrl && isAudio(capsule.media_path) && <audio controls src={mediaUrl} className="mt-5 w-full" />}
            {mediaUrl && isVideo(capsule.media_path) && (
              <video controls src={mediaUrl} className="mt-5 w-full rounded-xl" />
            )}
            {capsule.body && <p className="mt-5 leading-relaxed whitespace-pre-wrap text-white/80">{capsule.body}</p>}
          </div>
        </article>

        {isFuture && (
          <section className="glass p-6">
            <p className="text-xs tracking-widest text-cyan-mv">NOW</p>
            <h2 className="mt-1 text-xl font-semibold">What changed since then?</h2>
            <p className="mt-1 text-sm text-white/55">Write an epilogue to your past self.</p>
            <EpilogueForm id={capsule.id} initial={capsule.epilogue ?? ""} />
          </section>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <DeleteButton id={capsule.id} mediaPath={capsule.media_path} redirectTo={isFuture ? "/future" : "/vault"} />
      </div>
    </div>
  );
}
