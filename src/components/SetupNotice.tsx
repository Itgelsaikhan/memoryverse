import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function SetupNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-amber-mv/90 px-4 py-2 text-center text-sm font-medium text-black">
      Setup needed: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment
      variables to enable accounts and capsules.
    </div>
  );
}
