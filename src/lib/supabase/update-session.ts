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
  "/onboarding",
  "/admin",
  "/f1",
];

const ONBOARDING_ROUTE = "/onboarding";
const ONBOARDING_SKIP_PREFIXES = ["/admin", "/api", ONBOARDING_ROUTE];

async function checkNeedsOnboarding(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_needs_prediction_onboarding");

  if (error == null) {
    return Boolean(data);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "onboarding_campaign_id, onboarding_completed_at, is_ai, favorite_team_id",
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_ai) return false;

  const { data: config } = await supabase
    .from("tournament_config")
    .select("active_prediction_campaign")
    .eq("id", 1)
    .maybeSingle();

  const active =
    (config?.active_prediction_campaign as string | undefined) ?? "wc2026";

  if (!profileError?.message.includes("onboarding_campaign_id")) {
    if (profile.onboarding_campaign_id !== active) {
      return true;
    }
  } else if (profile.onboarding_completed_at == null) {
    return true;
  }

  const { data: requiredQuestions } = await supabase
    .from("prediction_campaign_questions")
    .select("question_id")
    .eq("campaign_id", active)
    .eq("required", true);

  if (!requiredQuestions?.length) {
    if (!profileError?.message.includes("onboarding_campaign_id")) {
      return profile.onboarding_campaign_id !== active;
    }
    return profile.onboarding_completed_at == null;
  }

  const { data: picks } = await supabase
    .from("tournament_picks")
    .select("question_id")
    .eq("user_id", user.id)
    .eq("campaign_id", active);

  const answered = new Set(
    (picks ?? []).map((p: { question_id: string }) => p.question_id),
  );

  if (
    profile.favorite_team_id != null &&
    requiredQuestions.some((q: { question_id: string }) => q.question_id === "favorite_team")
  ) {
    answered.add("favorite_team");
  }

  return requiredQuestions.some(
    (q: { question_id: string }) => !answered.has(q.question_id),
  );
}

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
    const needsOnboarding = await checkNeedsOnboarding(supabase);
    const url = request.nextUrl.clone();
    url.pathname = needsOnboarding ? ONBOARDING_ROUTE : "/dashboard";
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
    !ONBOARDING_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const needsOnboarding = await checkNeedsOnboarding(supabase);

    if (needsOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_ROUTE;
      if (pathname !== "/") {
        url.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
