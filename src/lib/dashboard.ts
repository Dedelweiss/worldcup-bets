import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { hasSupabaseConfig, requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData, MatchWithTeams } from "@/types/database";

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabaseConfig) {
    return MOCK_DASHBOARD;
  }

  const profile = await requireAuth();
  const supabase = await createClient();

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

  const upcomingMatches =
    matches && matches.length > 0
      ? (matches as unknown as MatchWithTeams[])
      : MOCK_DASHBOARD.upcomingMatches;

  return { profile, upcomingMatches };
}
