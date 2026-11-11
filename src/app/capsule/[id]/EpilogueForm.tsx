"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EpilogueForm({ id, initial }: { id: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const { error } = await createClient()
      .from("capsules")
      .update({ epilogue: text.trim() || null })
      .eq("id", id);
    setStatus(error ? "error" : "saved");
  }

  return (
    <div className="mt-4 space-y-3">
      <textarea
        className="input min-h-48"
        maxLength={5000}
        placeholder="Dear past me… Here's what came true, and what didn't."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus("idle");
        }}
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className="btn-primary" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save epilogue"}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-300">Saved ✓</span>}
        {status === "error" && <span className="text-sm text-red-300">Could not save. Try again.</span>}
      </div>
    </div>
  );
}
