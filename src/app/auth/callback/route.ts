import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/vault";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/vault";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  const reason = searchParams.get("error_description");
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      reason ??
        "This link could not be verified here. If you opened it in another browser, just log in — your account may already be active.",
    )}`,
  );
}
