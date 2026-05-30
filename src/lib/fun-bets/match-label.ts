import type { SupabaseClient } from "@supabase/supabase-js";

export function formatMatchLabel(
  homeName: string | null | undefined,
  awayName: string | null | undefined,
): string {
  if (homeName && awayName) return `${homeName} – ${awayName}`;
  return "ce match";
}

export async function fetchMatchLabel(
  supabase: SupabaseClient,
  matchId: number,
): Promise<string> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "home_team:teams!matches_home_team_id_fkey (name), away_team:teams!matches_away_team_id_fkey (name)",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error || !data) return "ce match";

  const home = Array.isArray(data.home_team)
    ? data.home_team[0]?.name
    : (data.home_team as { name?: string } | null)?.name;
  const away = Array.isArray(data.away_team)
    ? data.away_team[0]?.name
    : (data.away_team as { name?: string } | null)?.name;

  return formatMatchLabel(home, away);
}
