import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData, MatchWithTeams } from "@/types/database";

const hasSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabase) {
    return MOCK_DASHBOARD;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return MOCK_DASHBOARD;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, balance")
    .eq("id", user.id)
    .single();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id, round, status, kickoff_at, venue,
      home_score, away_score, odd_home, odd_draw, odd_away,
      home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
      away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
    `,
    )
    .in("status", ["scheduled", "live"])
    .gte("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(20);

  return {
    profile: profile ?? MOCK_DASHBOARD.profile,
    upcomingMatches: (matches as MatchWithTeams[] | null) ?? MOCK_DASHBOARD.upcomingMatches,
  };
}
