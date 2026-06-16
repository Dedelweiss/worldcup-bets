import { createClient } from "@/lib/supabase/server";
import type { FunMarket, MatchStatus, MatchWithTeams } from "@/types/database";

export interface FunMarketFeedItem extends FunMarket {
  match: Pick<
    MatchWithTeams,
    "id" | "status" | "kickoff_at" | "home_team" | "away_team"
  >;
}

export async function getFunMarketsByMatch(
  matchId: number,
): Promise<FunMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fun_markets")
    .select(
      "id, match_id, question, odd_yes, odd_no, status, winning_outcome, created_by, created_at",
    )
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  return (data ?? []) as FunMarket[];
}

export async function getFunMarketsForAdmin(matchId: number) {
  return getFunMarketsByMatch(matchId);
}

export function isFunMarketOpen(market: FunMarket): boolean {
  return market.status === "open";
}

export async function getOpenFunMarketsFeed(): Promise<FunMarketFeedItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fun_markets")
    .select(
      `
      id, match_id, question, odd_yes, odd_no, status, winning_outcome, created_at,
      match:matches (
        id, status, kickoff_at,
        home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
        away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
      )
    `,
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as FunMarket & {
      match: Record<string, unknown> & {
        home_team: unknown;
        away_team: unknown;
      };
    };
    const home = r.match.home_team;
    const away = r.match.away_team;
    return {
      id: r.id,
      match_id: r.match_id,
      question: r.question,
      odd_yes: r.odd_yes,
      odd_no: r.odd_no,
      status: r.status,
      winning_outcome: r.winning_outcome,
      created_at: r.created_at,
      match: {
        id: r.match.id as number,
        status: r.match.status as MatchStatus,
        kickoff_at: r.match.kickoff_at as string,
        home_team: (Array.isArray(home) ? home[0] : home) as MatchWithTeams["home_team"],
        away_team: (Array.isArray(away) ? away[0] : away) as MatchWithTeams["away_team"],
      },
    } satisfies FunMarketFeedItem;
  });
}
