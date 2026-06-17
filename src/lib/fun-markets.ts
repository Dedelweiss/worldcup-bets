import { createClient } from "@/lib/supabase/server";
import type { FunMarket, MatchStatus, MatchWithTeams } from "@/types/database";
import { isFunMarketBettingOpen } from "@/lib/bets/fun-market-betting";
import {
  FUN_MARKET_SELECT_FULL,
  FUN_MARKET_SELECT_LEGACY,
  isFunMarketSchemaError,
  normalizeFunMarketRow,
} from "@/lib/fun-markets-query";

export interface FunMarketFeedItem extends FunMarket {
  match: Pick<
    MatchWithTeams,
    "id" | "status" | "kickoff_at" | "home_team" | "away_team"
  >;
}

async function selectFunMarketsByMatch(matchId: number): Promise<FunMarket[]> {
  const supabase = await createClient();

  const full = await supabase
    .from("fun_markets")
    .select(FUN_MARKET_SELECT_FULL)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (!full.error) {
    return (full.data ?? []).map((row) =>
      normalizeFunMarketRow(row as Record<string, unknown>),
    );
  }

  if (!isFunMarketSchemaError(full.error)) {
    console.error("getFunMarketsByMatch", full.error);
    return [];
  }

  const legacy = await supabase
    .from("fun_markets")
    .select(FUN_MARKET_SELECT_LEGACY)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (legacy.error) {
    console.error("getFunMarketsByMatch (legacy)", legacy.error);
    return [];
  }

  return (legacy.data ?? []).map((row) =>
    normalizeFunMarketRow(row as Record<string, unknown>),
  );
}

export async function getFunMarketsByMatch(
  matchId: number,
): Promise<FunMarket[]> {
  return selectFunMarketsByMatch(matchId);
}

export async function getFunMarketsForAdmin(matchId: number) {
  return getFunMarketsByMatch(matchId);
}

export function isFunMarketOpen(
  market: FunMarket,
  match?: Pick<MatchWithTeams, "status" | "kickoff_at">,
): boolean {
  if (match) {
    return isFunMarketBettingOpen(market, match);
  }
  return market.status === "open";
}

const FUN_MARKET_FEED_SELECT_FULL = `
  ${FUN_MARKET_SELECT_FULL},
  match:matches (
    id, status, kickoff_at,
    home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
    away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
  )
`;

const FUN_MARKET_FEED_SELECT_LEGACY = `
  ${FUN_MARKET_SELECT_LEGACY},
  match:matches (
    id, status, kickoff_at,
    home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
    away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
  )
`;

function mapFeedRow(
  row: Record<string, unknown>,
): FunMarketFeedItem {
  const market = normalizeFunMarketRow(row);
  const match = row.match as Record<string, unknown> & {
    home_team: unknown;
    away_team: unknown;
  };
  const home = match.home_team;
  const away = match.away_team;

  return {
    ...market,
    match: {
      id: match.id as number,
      status: match.status as MatchStatus,
      kickoff_at: match.kickoff_at as string,
      home_team: (Array.isArray(home) ? home[0] : home) as MatchWithTeams["home_team"],
      away_team: (Array.isArray(away) ? away[0] : away) as MatchWithTeams["away_team"],
    },
  };
}

export async function getOpenFunMarketsFeed(): Promise<FunMarketFeedItem[]> {
  const supabase = await createClient();

  const full = await supabase
    .from("fun_markets")
    .select(FUN_MARKET_FEED_SELECT_FULL)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (!full.error) {
    return (full.data ?? []).map((row) =>
      mapFeedRow(row as Record<string, unknown>),
    );
  }

  if (!isFunMarketSchemaError(full.error)) {
    console.error("getOpenFunMarketsFeed", full.error);
    throw full.error;
  }

  const legacy = await supabase
    .from("fun_markets")
    .select(FUN_MARKET_FEED_SELECT_LEGACY)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (legacy.error) {
    console.error("getOpenFunMarketsFeed (legacy)", legacy.error);
    throw legacy.error;
  }

  return (legacy.data ?? []).map((row) =>
    mapFeedRow(row as Record<string, unknown>),
  );
}
