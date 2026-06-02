import { cache } from "react";
import { hasKickoffStarted } from "@/lib/format";
import { syncLiveMatches } from "@/lib/matches/sync-live";
import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/types/database";

export function normalizeMatch(row: unknown): MatchWithTeams {
  const m = row as Record<string, unknown>;
  const home = m.home_team;
  const away = m.away_team;
  return {
    ...m,
    home_team: Array.isArray(home) ? home[0] : home,
    away_team: Array.isArray(away) ? away[0] : away,
  } as MatchWithTeams;
}

export const MATCH_SELECT = `
  id, round, status, stage, kickoff_at, venue,
  tournament_group_id, bet_scope_note, is_golden,
  home_score, away_score, odd_home, odd_draw, odd_away,
  home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
  away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
`;

export const getMatchById = cache(async (
  id: number,
  options?: { skipLiveSync?: boolean },
): Promise<MatchWithTeams | null> => {
  if (!options?.skipLiveSync) {
    await syncLiveMatches();
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return normalizeMatch(data);
});

export function canPlaceBetOnMatch(match: MatchWithTeams): {
  allowed: boolean;
  reason?: string;
} {
  if (match.status !== "scheduled") {
    return {
      allowed: false,
      reason:
        match.status === "finished"
          ? "Ce match est terminé."
          : "Les paris sont fermés pour ce match.",
    };
  }
  if (hasKickoffStarted(match.kickoff_at)) {
    return { allowed: false, reason: "Le coup d'envoi est passé." };
  }
  if (!match.odd_home || !match.odd_draw || !match.odd_away) {
    return { allowed: false, reason: "Les cotes ne sont pas encore disponibles." };
  }
  return { allowed: true };
}
