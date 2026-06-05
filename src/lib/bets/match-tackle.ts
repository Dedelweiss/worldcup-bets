import { createClient } from "@/lib/supabase/server";
import {
  tacklePhaseForStage,
  type MatchTackleState,
  type UserTackleOnMatch,
  type UserTackleQuota,
} from "@/lib/bets/match-tackle-utils";
import type { MatchStage, TacklePhase } from "@/types/database";

export type { MatchTackleState, UserTackleOnMatch, UserTackleQuota };
export {
  tackleEligibleRivals,
  displayPlayerName,
  tacklePhaseForStage,
} from "@/lib/bets/match-tackle-utils";

export async function getMatchTackleState(
  matchId: number,
  userId: string,
  stage?: MatchStage | null,
): Promise<MatchTackleState> {
  const phase = tacklePhaseForStage(stage);
  const supabase = await createClient();

  const { data: tackles } = await supabase
    .from("tackles")
    .select(
      `
      id,
      match_id,
      target_id,
      phase,
      is_resolved,
      attacker_won,
      attacker_delta,
      target:profiles!tackles_target_id_fkey (username, display_name)
    `,
    )
    .eq("attacker_id", userId);

  const rows = (tackles ?? []) as Record<string, unknown>[];

  const quotas: UserTackleQuota[] = (["group", "knockout"] as TacklePhase[]).map(
    (p) => {
      const row = rows.find((r) => r.phase === p);
      return {
        phase: p,
        used: Boolean(row),
        usedMatchId: row ? (row.match_id as number) : null,
      };
    },
  );

  const onMatch = rows.find((r) => r.match_id === matchId);
  let matchTackle: UserTackleOnMatch | null = null;

  if (onMatch) {
    const targetRaw = onMatch.target;
    const target = Array.isArray(targetRaw) ? targetRaw[0] : targetRaw;
    const t = target as {
      username?: string | null;
      display_name?: string | null;
    } | null;

    matchTackle = {
      id: onMatch.id as string,
      target_id: onMatch.target_id as string,
      target_username: t?.username ?? null,
      target_display_name: t?.display_name ?? null,
      phase: onMatch.phase as TacklePhase,
      is_resolved: Boolean(onMatch.is_resolved),
      attacker_won: (onMatch.attacker_won as boolean | null) ?? null,
      attacker_delta:
        onMatch.attacker_delta != null ? Number(onMatch.attacker_delta) : null,
    };
  }

  return { matchTackle, quotas, phase };
}
