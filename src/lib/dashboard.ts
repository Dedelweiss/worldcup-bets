import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { hasSupabaseConfig, requireAuth } from "@/lib/auth-server";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { syncLiveMatches } from "@/lib/matches/sync-live";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData, MatchWithTeams } from "@/types/database";

function normalizeMatches(
  rows: unknown[] | null,
): MatchWithTeams[] {
  if (!rows?.length) return [];
  return rows.map((row) => {
    const m = row as Record<string, unknown>;
    const home = m.home_team;
    const away = m.away_team;
    return {
      ...m,
      home_team: Array.isArray(home) ? home[0] : home,
      away_team: Array.isArray(away) ? away[0] : away,
    } as MatchWithTeams;
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabaseConfig) {
    return { ...MOCK_DASHBOARD, isDemo: true };
  }

  const profile = await requireAuth();
  await syncLiveMatches();
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id, round, status, kickoff_at, venue, is_golden,
      home_score, away_score, odd_home, odd_draw, odd_away,
      home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
      away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
    `,
    )
    .in("status", ["scheduled", "live"])
    .order("kickoff_at", { ascending: true })
    .limit(30);

  const upcoming = normalizeMatches(matches).filter((m) => {
    if (m.status === "live") return true;
    return new Date(m.kickoff_at) >= new Date();
  });

  const stats = await getDashboardStats(profile.id, profile.points);

  return {
    profile,
    upcomingMatches: upcoming,
    stats,
    isDemo: false,
  };
}
