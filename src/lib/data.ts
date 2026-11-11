import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Capsule, CapsuleKind } from "@/lib/capsules";

export async function getMyCapsules(kind?: CapsuleKind) {
  if (!isSupabaseConfigured) return { capsules: [] as Capsule[], urls: {} as Record<string, string> };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_capsules", { p_kind: kind ?? null });
  if (error) throw new Error(error.message);
  const capsules = (data ?? []) as Capsule[];

  const paths = capsules.map((c) => c.media_path).filter((p): p is string => !!p);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrls(paths, 3600);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    });
  }
  return { capsules, urls };
}
