"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

export default function DeleteButton({
  id,
  redirectTo,
  compact = false,
}: {
  id: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setBusy(true);
    setError(false);
    const supabase = createClient();
    const { data: mediaPath, error } = await supabase.rpc("delete_my_capsule", { p_id: id });
    if (error) {
      setError(true);
      setBusy(false);
      return;
    }
    if (typeof mediaPath === "string" && mediaPath) {
      await supabase.storage.from("media").remove([mediaPath]);
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className={compact ? "text-xs text-white/40 hover:text-red-300" : "btn-ghost text-sm text-red-300"}
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={compact ? 12 : 14} className="mr-1 inline" />
        {compact ? t.del.short : t.del.full}
      </button>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {error && <span className="text-red-300">{t.del.failed}</span>}
      <span className="text-white/60">{t.del.confirm}</span>
      <button type="button" className="btn-ghost px-2! py-1!" onClick={() => setConfirming(false)} disabled={busy}>
        {t.common.cancel}
      </button>
      <button
        type="button"
        className="btn-ghost border-red-400/50 px-2! py-1! text-red-300"
        onClick={remove}
        disabled={busy}
      >
        {busy ? t.del.deleting : t.del.yes}
      </button>
    </div>
  );
}
