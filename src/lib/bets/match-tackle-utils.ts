import type { MatchParticipationPlayer } from "@/lib/bets/match-participation";
import type { MatchStage, TacklePhase } from "@/types/database";

export interface UserTackleOnMatch {
  id: string;
  target_id: string;
  target_username: string | null;
  target_display_name: string | null;
  phase: TacklePhase;
  is_resolved: boolean;
  attacker_won: boolean | null;
  attacker_delta: number | null;
}

export interface UserTackleQuota {
  phase: TacklePhase;
  used: boolean;
  usedMatchId: number | null;
}

/** Tacle reçu sur ce match (on est la cible). */
export interface IncomingTackleOnMatch {
  id: string;
  attacker_id: string;
  attacker_username: string | null;
  attacker_display_name: string | null;
  attacker_avatar_url: string | null;
  phase: TacklePhase;
  is_resolved: boolean;
  attacker_won: boolean | null;
  attacker_delta: number | null;
  target_delta: number | null;
}

export interface MatchTackleState {
  matchTackle: UserTackleOnMatch | null;
  incomingTackles: IncomingTackleOnMatch[];
  quotas: UserTackleQuota[];
  phase: TacklePhase;
}

export function tacklePhaseForStage(stage?: MatchStage | null): TacklePhase {
  return stage == null || stage === "group" ? "group" : "knockout";
}

export function tackleEligibleRivals(
  bettors: MatchParticipationPlayer[],
  currentUserId: string,
): MatchParticipationPlayer[] {
  return bettors.filter(
    (p) => p.user_id !== currentUserId && p.has_bet && !p.is_ai,
  );
}

export function displayPlayerName(
  username: string | null,
  displayName: string | null,
): string {
  return username ?? displayName ?? "Joueur";
}
