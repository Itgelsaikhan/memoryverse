"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Hourglass, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EMOTIONS, localYMD, type CapsuleKind } from "@/lib/capsules";
import { COUNTRIES } from "@/lib/countries";
import { planDef, planErrorMessage, type MyPlan } from "@/lib/plans";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/*,audio/*,video/mp4,video/quicktime";

function addYears(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return localYMD(d);
}

export default function NewCapsuleForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [kind, setKind] = useState<CapsuleKind>(params.get("kind") === "future" ? "future" : "memory");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [location, setLocation] = useState("");
  const [unlockDate, setUnlockDate] = useState(() => addYears(1));
  const [isPublic, setIsPublic] = useState(false);
  const [country, setCountry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [today] = useState(() => localYMD(new Date()));
  const [tomorrow] = useState(() => localYMD(new Date(Date.now() + 86_400_000)));
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<MyPlan | null>(null);

  useEffect(() => {
    createClient()
      .rpc("my_plan")
      .maybeSingle()
      .then(({ data }) => setPlan((data as MyPlan | null) ?? null));
  }, []);
  const effective = plan?.effective_plan ?? "free";
  const maxYears = planDef(effective).maxUnlockYears;
  // Latest allowed opening date for the user's plan (pure string math on today's date)
  const maxUnlock = `${Number(today.slice(0, 4)) + maxYears}${today.slice(4)}`;
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );

  function pickFile(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("File is too large (max 50 MB).");
      return;
    }
    if (f.type.startsWith("video/") && effective === "free") {
      setError("Video capsules are a Premium feature.");
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (kind === "future" && new Date(unlockDate) <= new Date()) {
      setError("The opening date must be in the future.");
      return;
    }
    if (isPublic && kind === "memory" && !country) {
      setError("Choose a country to share this memory on the Humanity Map.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      let media_path: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        media_path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(media_path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
      }

      const { error: insErr } = await supabase.from("capsules").insert({
        kind,
        title: title.trim(),
        body: body.trim() || null,
        emotion,
        topic: topic.trim() || null,
        memory_date: kind === "memory" && memoryDate ? memoryDate : null,
        location_name: location.trim() || null,
        country: country || null,
        media_path,
        is_public: kind === "memory" && isPublic,
        unlock_at: kind === "future" ? new Date(`${unlockDate}T00:00:00`).toISOString() : null,
      });
      if (insErr) {
        if (media_path) await supabase.storage.from("media").remove([media_path]);
        throw new Error(planErrorMessage(insErr.message) ?? insErr.message);
      }

      router.push(kind === "future" ? "/future" : "/vault");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the capsule.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create a capsule</h1>
        <p className="mt-1 text-white/60">Keep a memory, or send a message to your future self.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { id: "memory", label: "Memory", sub: "Save it to your vault", icon: Archive },
            { id: "future", label: "Future capsule", sub: "Sealed until a date", icon: Hourglass },
          ] as const
        ).map((k) => (
          <button
            type="button"
            key={k.id}
            onClick={() => setKind(k.id)}
            className={`glass flex items-start gap-3 p-4 text-left transition ${
              kind === k.id ? "ring-2 ring-violet-mv" : "opacity-70 hover:opacity-100"
            }`}
          >
            <k.icon size={20} className={k.id === "memory" ? "text-amber-mv" : "text-cyan-mv"} />
            <span>
              <span className="block font-semibold">{k.label}</span>
              <span className="text-xs text-white/55">{k.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="glass space-y-5 p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Title *</span>
          <input
            className="input"
            required
            maxLength={120}
            placeholder={kind === "future" ? "Letter to me at 25" : "Summer at grandma's countryside"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-white/70">
            {kind === "future" ? "Your letter & predictions" : "Your memory"}
          </span>
          <textarea
            className="input min-h-36"
            maxLength={10000}
            placeholder={
              kind === "future"
                ? "Dear future me… By the time you read this, I think you will…"
                : "What happened? Who was there? How did it feel?"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <div className="text-sm">
          <span className="mb-1 block text-white/70">Photo, voice or video (optional)</span>
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-lg bg-white/5 text-2xl">🎞️</span>
              )}
              <span className="flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove file">
                <X size={18} />
              </button>
            </div>
          ) : (
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 p-8 text-white/60 hover:bg-white/5"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <Upload size={22} />
              Drop a file here or click to choose (max 50 MB{effective === "free" ? ", video on Premium" : ""})
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        <div className="text-sm">
          <span className="mb-2 block text-white/70">How does it feel?</span>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((em) => (
              <button
                type="button"
                key={em.id}
                onClick={() => setEmotion(emotion === em.id ? null : em.id)}
                className="rounded-full border px-3 py-1 transition"
                style={{
                  borderColor: emotion === em.id ? em.color : "rgba(255,255,255,0.12)",
                  background: emotion === em.id ? `${em.color}26` : "transparent",
                }}
              >
                {em.emoji} {em.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {kind === "memory" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-white/70">When did it happen?</span>
              <input
                className="input"
                type="date"
                max={today}
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
              />
            </label>
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block text-white/70">Opens on *</span>
              <input
                className="input"
                type="date"
                required
                min={tomorrow}
                max={maxUnlock}
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
              />
              <span className="mt-2 flex gap-2 text-xs">
                {(effective === "free" ? [1, 3, 5] : [1, 5, 10, 25]).map((y) => (
                  <button
                    type="button"
                    key={y}
                    className="rounded-full bg-white/5 px-2 py-0.5 hover:bg-white/10"
                    onClick={() => setUnlockDate(addYears(y))}
                  >
                    +{y} year{y > 1 ? "s" : ""}
                  </button>
                ))}
              </span>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-white/70">Place</span>
            <input
              className="input"
              maxLength={120}
              placeholder="Ulaanbaatar, Mongolia"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Topic</span>
          <input
            className="input"
            maxLength={40}
            placeholder="family, travel, career…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Country</span>
          <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">— Not specified —</option>
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {kind === "memory" ? (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-violet-500"
            />
            <span>
              Share anonymously on the Humanity Map
              <span className="block text-xs text-white/45">
                Only the text, emotion, topic and country are shared — never your name, photo or exact place.
              </span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-white/45">
            🔒 Future capsules are always private and never appear on the Humanity Map.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
          {error}
          {effective === "free" && /Premium|Free plan|5 years/.test(error) && (
            <>
              {" "}
              <Link href="/pricing" className="underline">
                See plans
              </Link>
            </>
          )}
        </p>
      )}

      <button className="btn-primary w-full justify-center" disabled={saving}>
        {saving ? "Saving…" : kind === "future" ? "Seal capsule 🔒" : "Save memory"}
      </button>
    </form>
  );
}
