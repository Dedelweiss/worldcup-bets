import { createClient } from "@/lib/supabase/server";

export interface MatchParticipationPlayer {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  has_bet: boolean;
  has_match_result: boolean;
  has_exact_score: boolean;
}

export interface MatchBettingParticipation {
  bettors: MatchParticipationPlayer[];
  pending: MatchParticipationPlayer[];
  totalPlayers: number;
}

export async function getMatchBettingParticipation(
  matchId: number,
): Promise<MatchBettingParticipation> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_match_betting_participation", {
    p_match_id: matchId,
  });

  if (error || !data) {
    return { bettors: [], pending: [], totalPlayers: 0 };
  }

  const rows = (data as Record<string, unknown>[]).map((r) => ({
    user_id: r.user_id as string,
    username: (r.username as string | null) ?? null,
    display_name: (r.display_name as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    has_bet: Boolean(r.has_bet),
    has_match_result: Boolean(r.has_match_result),
    has_exact_score: Boolean(r.has_exact_score),
  }));

  const bettors = rows.filter((r) => r.has_bet);
  const pending = rows.filter((r) => !r.has_bet);

  return {
    bettors,
    pending,
    totalPlayers: rows.length,
  };
}
