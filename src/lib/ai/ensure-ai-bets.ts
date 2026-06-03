import { generateScorePrediction } from "@/lib/ai/generate-score-prediction";
import { createAdminClient } from "@/lib/supabase/admin";

interface MatchNeedingAiBet {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  odd_home: number | null;
  odd_draw: number | null;
  odd_away: number | null;
}

/** Place les paris score exact IA pour les matchs venant de passer en direct. */
export async function ensureAiBetsForLiveMatches(): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    console.warn(
      "ensureAiBetsForLiveMatches: SUPABASE_SERVICE_ROLE_KEY manquante — l'IA ne peut pas parier.",
    );
    return;
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return;
  }

  const { data, error } = await supabase.rpc("get_matches_needing_ai_bet");

  if (error || !data?.length) return;

  for (const row of data as MatchNeedingAiBet[]) {
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
      console.error(
        `place_ai_exact_score_bet match ${row.match_id}:`,
        placeError.message,
      );
    }
  }
}
