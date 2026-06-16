import { createClient } from "@/lib/supabase/server";
import {
  buildSummaryPrompt,
  generateMatchSummaryText,
  type SummaryBetRow,
} from "@/lib/ai/match-summary";
import { getMatchById } from "@/lib/matches";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";

export type GenerateSummaryResult =
  | { success: true; summary: string }
  | { success: false; error: string };

export async function generateAndSaveMatchSummary(
  matchId: number,
  options?: { overwrite?: boolean },
): Promise<GenerateSummaryResult> {
  const overwrite = options?.overwrite ?? false;
  const match = await getMatchById(matchId, { skipLiveSync: true });
  if (!match) {
    return { success: false, error: "Match introuvable." };
  }

  if (match.ai_summary && !overwrite) {
    return {
      success: false,
      error: "La Gazette a déjà été générée pour ce match.",
    };
  }

  const supabase = await createClient();

  const { data: betsRaw, error: betsError } = await supabase.rpc(
    "get_match_bets_for_summary",
    { p_match_id: matchId },
  );

  if (betsError) {
    return { success: false, error: betsError.message };
  }

  const bets = (betsRaw ?? []) as SummaryBetRow[];
  const matchLabel = `${tbdTeamDisplayName(match.home_team)} vs ${tbdTeamDisplayName(match.away_team)}`;
  const { system, user } = buildSummaryPrompt(matchLabel, bets, {
    home: tbdTeamDisplayName(match.home_team),
    away: tbdTeamDisplayName(match.away_team),
  });

  let summary: string;
  try {
    summary = await generateMatchSummaryText(system, user);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur LLM.",
    };
  }

  const { error: saveError } = await supabase.rpc("save_match_ai_summary", {
    p_match_id: matchId,
    p_summary: summary,
    p_overwrite: overwrite,
  });

  if (saveError) {
    return { success: false, error: saveError.message };
  }

  return { success: true, summary };
}
