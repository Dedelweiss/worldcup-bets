import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/bets",
  "/leaderboard",
  "/leagues",
  "/matches",
  "/profile",
  "/bracket",
  "/help",
  "/choose-favorite-team",
  "/admin",
];

const FAVORITE_TEAM_ROUTE = "/choose-favorite-team";
const FAVORITE_TEAM_SKIP_PREFIXES = ["/admin", "/api", FAVORITE_TEAM_ROUTE];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (
    user &&
    !isAuthRoute &&
    !FAVORITE_TEAM_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_team_id, is_ai")
      .eq("id", user.id)
      .single();

    if (
      profile &&
      !profile.is_ai &&
      profile.favorite_team_id == null
    ) {
      const { data: selectionOpen, error: selectionError } = await supabase.rpc(
        "is_favorite_team_selection_open",
      );

      const open =
        selectionError == null
          ? Boolean(selectionOpen)
          : await fallbackFavoriteTeamSelectionOpen(supabase);

      if (open) {
        const url = request.nextUrl.clone();
        url.pathname = FAVORITE_TEAM_ROUTE;
        if (pathname !== "/") {
          url.searchParams.set("next", pathname);
        }
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

async function fallbackFavoriteTeamSelectionOpen(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const { data } = await supabase
    .from("matches")
    .select("kickoff_at")
    .not("status", "in", "(cancelled,postponed)")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.kickoff_at) return true;
  return new Date(String(data.kickoff_at)).getTime() > Date.now();
}
