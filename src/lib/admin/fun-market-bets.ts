import { requireAdmin } from "@/lib/auth-server";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { createClient } from "@/lib/supabase/server";
import type { BetStatus, FunOutcome } from "@/types/database";

export interface AdminFunMarketBet {
  id: string;
  funMarketId: string;
  outcome: FunOutcome;
  odd_at_placement: number;
  potential_payout: number;
  status: BetStatus;
  playerLabel: string;
}

export type AdminFunMarketBetsByMarket = Map<string, AdminFunMarketBet[]>;

export async function getFunMarketBetsForAdmin(
  matchId: number,
): Promise<AdminFunMarketBetsByMarket> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      id,
      fun_market_id,
      market_id,
      selection,
      odd_at_placement,
      potential_payout,
      status,
      profiles (username, display_name)
    `,
    )
    .eq("match_id", matchId)
    .eq("bet_type", "fun")
    .in("status", ["pending", "won", "lost"])
    .order("placed_at", { ascending: true });

  const byMarket: AdminFunMarketBetsByMarket = new Map();
  if (error || !data) return byMarket;

  for (const row of data) {
    const selection = row.selection as { outcome?: string } | null;
    const outcome = selection?.outcome;
    if (outcome !== "yes" && outcome !== "no") continue;

    const funMarketId =
      (row.fun_market_id as string | null) ??
      (row.market_id as string | null);
    if (!funMarketId) continue;

    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const p = profile as {
      username?: string | null;
      display_name?: string | null;
    } | null;

    const bet: AdminFunMarketBet = {
      id: row.id as string,
      funMarketId,
      outcome,
      odd_at_placement: Number(row.odd_at_placement),
      potential_payout: Number(row.potential_payout),
      status: row.status as BetStatus,
      playerLabel: getPlayerLabel({
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
      }),
    };

    const list = byMarket.get(funMarketId) ?? [];
    list.push(bet);
    byMarket.set(funMarketId, list);
  }

  return byMarket;
}
