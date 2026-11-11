"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteButton({
  id,
  mediaPath,
  redirectTo,
}: {
  id: string;
  mediaPath: string | null;
  redirectTo: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setBusy(true);
    setError(false);
    const supabase = createClient();
    const { error } = await supabase.from("capsules").delete().eq("id", id);
    if (error) {
      setError(true);
      setBusy(false);
      return;
    }
    if (mediaPath) await supabase.storage.from("media").remove([mediaPath]);
    router.push(redirectTo);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button type="button" className="btn-ghost text-sm text-red-300" onClick={() => setConfirming(true)}>
        <Trash2 size={14} /> Delete capsule
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      {error && <span className="text-red-300">Delete failed.</span>}
      <span className="text-white/60">Delete forever?</span>
      <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </button>
      <button type="button" className="btn-ghost border-red-400/50 text-red-300" onClick={remove} disabled={busy}>
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
    </div>
  );
}
