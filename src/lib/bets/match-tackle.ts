import { createClient } from "@/lib/supabase/server";
import {
  tacklePhaseForStage,
  type IncomingTackleOnMatch,
  type MatchTackleState,
  type UserTackleOnMatch,
  type UserTackleQuota,
} from "@/lib/bets/match-tackle-utils";
import type { MatchStage, TacklePhase } from "@/types/database";

export type {
  IncomingTackleOnMatch,
  MatchTackleState,
  UserTackleOnMatch,
  UserTackleQuota,
};
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

  const [{ data: tackles }, { data: incomingRows }] = await Promise.all([
    supabase
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
      .eq("attacker_id", userId),
    supabase
      .from("tackles")
      .select(
        `
        id,
        attacker_id,
        phase,
        is_resolved,
        attacker_won,
        attacker_delta,
        target_delta,
        attacker:profiles!tackles_attacker_id_fkey (username, display_name, avatar_url)
      `,
      )
      .eq("match_id", matchId)
      .eq("target_id", userId),
  ]);

  const rows = (tackles ?? []) as Record<string, unknown>[];
  const incomingTackles: IncomingTackleOnMatch[] = (
    (incomingRows ?? []) as Record<string, unknown>[]
  ).map((row) => {
    const attackerRaw = row.attacker;
    const attacker = Array.isArray(attackerRaw) ? attackerRaw[0] : attackerRaw;
    const a = attacker as {
      username?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    } | null;

    return {
      id: row.id as string,
      attacker_id: row.attacker_id as string,
      attacker_username: a?.username ?? null,
      attacker_display_name: a?.display_name ?? null,
      attacker_avatar_url: a?.avatar_url ?? null,
      phase: row.phase as IncomingTackleOnMatch["phase"],
      is_resolved: Boolean(row.is_resolved),
      attacker_won: (row.attacker_won as boolean | null) ?? null,
      attacker_delta:
        row.attacker_delta != null ? Number(row.attacker_delta) : null,
      target_delta: row.target_delta != null ? Number(row.target_delta) : null,
    };
  });

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

  return { matchTackle, incomingTackles, quotas, phase };
}
