import type { SupabaseClient } from "@supabase/supabase-js";
import { fifaNoFromMatchId } from "@/lib/tournament/knockout-match-display";

const TBD_HOME_TEAM_ID = 9001;
const TBD_AWAY_TEAM_ID = 9002;

type FeederOutcome = "winner" | "loser";
type FeederSlot = "home" | "away";

interface KnockoutFeeder {
  childMatchId: number;
  slot: FeederSlot;
  sourceFifaNo: number;
  outcome: FeederOutcome;
}

/** M73–M104 : créneaux alimentés par vainqueur (V) ou perdant (P) d'un match précédent. */
const KNOCKOUT_FEEDERS: KnockoutFeeder[] = [
  { childMatchId: 2026089, slot: "home", sourceFifaNo: 74, outcome: "winner" },
  { childMatchId: 2026089, slot: "away", sourceFifaNo: 77, outcome: "winner" },
  { childMatchId: 2026090, slot: "home", sourceFifaNo: 73, outcome: "winner" },
  { childMatchId: 2026090, slot: "away", sourceFifaNo: 75, outcome: "winner" },
  { childMatchId: 2026091, slot: "home", sourceFifaNo: 76, outcome: "winner" },
  { childMatchId: 2026091, slot: "away", sourceFifaNo: 78, outcome: "winner" },
  { childMatchId: 2026092, slot: "home", sourceFifaNo: 79, outcome: "winner" },
  { childMatchId: 2026092, slot: "away", sourceFifaNo: 80, outcome: "winner" },
  { childMatchId: 2026093, slot: "home", sourceFifaNo: 83, outcome: "winner" },
  { childMatchId: 2026093, slot: "away", sourceFifaNo: 84, outcome: "winner" },
  { childMatchId: 2026094, slot: "home", sourceFifaNo: 81, outcome: "winner" },
  { childMatchId: 2026094, slot: "away", sourceFifaNo: 82, outcome: "winner" },
  { childMatchId: 2026095, slot: "home", sourceFifaNo: 86, outcome: "winner" },
  { childMatchId: 2026095, slot: "away", sourceFifaNo: 88, outcome: "winner" },
  { childMatchId: 2026096, slot: "home", sourceFifaNo: 85, outcome: "winner" },
  { childMatchId: 2026096, slot: "away", sourceFifaNo: 87, outcome: "winner" },
  { childMatchId: 2026097, slot: "home", sourceFifaNo: 89, outcome: "winner" },
  { childMatchId: 2026097, slot: "away", sourceFifaNo: 90, outcome: "winner" },
  { childMatchId: 2026098, slot: "home", sourceFifaNo: 93, outcome: "winner" },
  { childMatchId: 2026098, slot: "away", sourceFifaNo: 94, outcome: "winner" },
  { childMatchId: 2026099, slot: "home", sourceFifaNo: 91, outcome: "winner" },
  { childMatchId: 2026099, slot: "away", sourceFifaNo: 92, outcome: "winner" },
  { childMatchId: 2026100, slot: "home", sourceFifaNo: 95, outcome: "winner" },
  { childMatchId: 2026100, slot: "away", sourceFifaNo: 96, outcome: "winner" },
  { childMatchId: 2026101, slot: "home", sourceFifaNo: 97, outcome: "winner" },
  { childMatchId: 2026101, slot: "away", sourceFifaNo: 98, outcome: "winner" },
  { childMatchId: 2026102, slot: "home", sourceFifaNo: 99, outcome: "winner" },
  { childMatchId: 2026102, slot: "away", sourceFifaNo: 100, outcome: "winner" },
  { childMatchId: 2026103, slot: "home", sourceFifaNo: 101, outcome: "loser" },
  { childMatchId: 2026103, slot: "away", sourceFifaNo: 102, outcome: "loser" },
  { childMatchId: 2026104, slot: "home", sourceFifaNo: 101, outcome: "winner" },
  { childMatchId: 2026104, slot: "away", sourceFifaNo: 102, outcome: "winner" },
];

interface MatchOutcomeRow {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  stage: string;
}

function outcomeTeamId(
  match: MatchOutcomeRow,
  outcome: FeederOutcome,
): number | null {
  if (match.home_score == null || match.away_score == null) return null;
  if (match.home_score === match.away_score) return null;

  const homeWon = match.home_score > match.away_score;
  if (outcome === "winner") {
    return homeWon ? match.home_team_id : match.away_team_id;
  }
  return homeWon ? match.away_team_id : match.home_team_id;
}

function tbdTeamIdForSlot(slot: FeederSlot): number {
  return slot === "home" ? TBD_HOME_TEAM_ID : TBD_AWAY_TEAM_ID;
}

export interface KnockoutAdvancementResult {
  skipped: boolean;
  updatedSlots: number;
  fifaNo: number | null;
}

/** Après clôture d'un match de phase finale, place vainqueur/perdant dans le(s) match(s) suivant(s). */
export async function propagateKnockoutAdvancement(
  supabase: SupabaseClient,
  matchId: number,
): Promise<KnockoutAdvancementResult> {
  const fifaNo = fifaNoFromMatchId(matchId);
  if (fifaNo == null) {
    return { skipped: true, updatedSlots: 0, fifaNo: null };
  }

  const feeders = KNOCKOUT_FEEDERS.filter((f) => f.sourceFifaNo === fifaNo);
  if (feeders.length === 0) {
    return { skipped: true, updatedSlots: 0, fifaNo };
  }

  const { data: source, error: sourceError } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, home_score, away_score, stage")
    .eq("id", matchId)
    .maybeSingle();

  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? "Match source introuvable");
  }

  let updatedSlots = 0;

  for (const feeder of feeders) {
    const teamId = outcomeTeamId(source, feeder.outcome);
    if (teamId == null) continue;

    const patch =
      feeder.slot === "home"
        ? { home_team_id: teamId, updated_at: new Date().toISOString() }
        : { away_team_id: teamId, updated_at: new Date().toISOString() };

    const { error } = await supabase
      .from("matches")
      .update(patch)
      .eq("id", feeder.childMatchId);

    if (error) throw new Error(error.message);
    updatedSlots += 1;
  }

  return { skipped: false, updatedSlots, fifaNo };
}

/** Annule l'avancement d'un match rouvert (créneau enfant repasse en TBD). */
export async function resetKnockoutAdvancement(
  supabase: SupabaseClient,
  matchId: number,
): Promise<KnockoutAdvancementResult> {
  const fifaNo = fifaNoFromMatchId(matchId);
  if (fifaNo == null) {
    return { skipped: true, updatedSlots: 0, fifaNo: null };
  }

  const feeders = KNOCKOUT_FEEDERS.filter((f) => f.sourceFifaNo === fifaNo);
  if (feeders.length === 0) {
    return { skipped: true, updatedSlots: 0, fifaNo };
  }

  let updatedSlots = 0;

  for (const feeder of feeders) {
    const tbdId = tbdTeamIdForSlot(feeder.slot);
    const patch =
      feeder.slot === "home"
        ? { home_team_id: tbdId, updated_at: new Date().toISOString() }
        : { away_team_id: tbdId, updated_at: new Date().toISOString() };

    const { error } = await supabase
      .from("matches")
      .update(patch)
      .eq("id", feeder.childMatchId);

    if (error) throw new Error(error.message);
    updatedSlots += 1;
  }

  return { skipped: false, updatedSlots, fifaNo };
}