import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function SetupNotice({ text }: { text: string }) {
  if (isSupabaseConfigured) return null;
  return <div className="bg-amber-mv/90 px-4 py-2 text-center text-sm font-medium text-black">{text}</div>;
}
