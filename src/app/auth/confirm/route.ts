import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email confirmation via token_hash — works even if the link is opened
// in a different browser or device than the one used to sign up.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/vault";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/vault";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "This confirmation link is invalid or was already used. Try logging in — your account may already be active.",
    )}`,
  );
}
