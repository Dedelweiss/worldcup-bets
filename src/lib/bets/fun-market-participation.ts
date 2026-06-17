import { createClient } from "@/lib/supabase/server";

export interface FunMarketParticipant {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_ai?: boolean;
}

export type FunMarketParticipationByMarket = Map<string, FunMarketParticipant[]>;

export async function getFunMarketParticipation(
  matchId: number,
): Promise<FunMarketParticipationByMarket> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_match_fun_market_participation",
    { p_match_id: matchId },
  );

  const byMarket: FunMarketParticipationByMarket = new Map();
  if (error || !data) {
    if (error) {
      console.error("get_match_fun_market_participation", error);
    }
    return byMarket;
  }

  for (const row of data as Record<string, unknown>[]) {
    const marketId = row.fun_market_id as string;
    const participant: FunMarketParticipant = {
      user_id: row.user_id as string,
      username: (row.username as string | null) ?? null,
      display_name: (row.display_name as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      is_ai: Boolean(row.is_ai),
    };

    const list = byMarket.get(marketId) ?? [];
    list.push(participant);
    byMarket.set(marketId, list);
  }

  return byMarket;
}
