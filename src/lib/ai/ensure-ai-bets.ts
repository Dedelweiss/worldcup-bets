import { logAppEvent } from "@/lib/logging/app-logger";
import { generateScorePrediction } from "@/lib/ai/generate-score-prediction";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/supabase/env";

interface MatchNeedingAiBet {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  odd_home: number | null;
  odd_draw: number | null;
  odd_away: number | null;
}

async function placeAiBetForRow(
  supabase: ReturnType<typeof createAdminClient>,
  row: MatchNeedingAiBet,
): Promise<void> {
  const prediction = await generateScorePrediction({
    homeTeam: row.home_team_name,
    awayTeam: row.away_team_name,
    oddHome: row.odd_home != null ? Number(row.odd_home) : null,
    oddDraw: row.odd_draw != null ? Number(row.odd_draw) : null,
    oddAway: row.odd_away != null ? Number(row.odd_away) : null,
  });

  const { error: placeError } = await supabase.rpc("place_ai_exact_score_bet", {
    p_match_id: row.match_id,
    p_home: prediction.home,
    p_away: prediction.away,
  });

  if (placeError) {
    logAppEvent({
      level: "error",
      source: "ai.placeBet",
      message: placeError.message,
      metadata: { matchId: row.match_id },
    });
  }
}

function getAdminSupabase(): ReturnType<typeof createAdminClient> | null {
  if (!isAdminConfigured()) {
    logAppEvent({
      level: "warn",
      source: "ai.bets",
      message: "SUPABASE_SERVICE_ROLE_KEY manquante — l'IA ne peut pas parier.",
    });
    return null;
  }

  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Place le pari score exact IA pour un match (si absent). */
export async function ensureAiBetForMatch(matchId: number): Promise<void> {
  const supabase = getAdminSupabase();
  if (!supabase) return;

  const { data, error } = await supabase.rpc("get_matches_needing_ai_bet");
  if (error || !data?.length) return;

  const row = (data as MatchNeedingAiBet[]).find((m) => m.match_id === matchId);
  if (!row) return;

  await placeAiBetForRow(supabase, row);
}

/** Place les paris score exact IA pour les matchs venant de passer en direct. */
export async function ensureAiBetsForLiveMatches(): Promise<void> {
  const supabase = getAdminSupabase();
  if (!supabase) return;

  const { data, error } = await supabase.rpc("get_matches_needing_ai_bet");
  if (error || !data?.length) return;

  for (const row of data as MatchNeedingAiBet[]) {
    await placeAiBetForRow(supabase, row);
  }
}
