import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  const hasSupabase = Boolean(getSupabaseUrl()) && Boolean(getSupabaseAnonKey());

  if (!hasSupabase) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
