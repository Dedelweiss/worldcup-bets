import { QuickBetMode } from "@/components/bets/quick-bet-mode";
import { filterQuickBetMatches } from "@/lib/bets/quick-bet-matches";
import { getUserMatchBetStatuses } from "@/lib/bets/user-match-status-query";
import { hasSupabaseConfig, requireAuth } from "@/lib/auth-server";
import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { listMatchesForPlayers } from "@/lib/tournament/queries";
import type { MatchWithTeams } from "@/types/database";

export const metadata = {
  title: "Mode rapide · Poules",
  description:
    "Pronostics rapides sur le résultat des matchs de poule par glissement",
};

function demoGroupMatches(): MatchWithTeams[] {
  return MOCK_DASHBOARD.upcomingMatches.map((m) => ({
    ...m,
    stage: "group" as const,
    tournament_group_id: 1,
    is_golden: false,
    bet_scope_note: null,
  }));
}

export default async function QuickBetPage() {
  const profile = await requireAuth();
  const isDemo = !hasSupabaseConfig;

  const matches = isDemo
    ? demoGroupMatches()
    : await listMatchesForPlayers({ filter: "group", limit: 80 });

  const betStatuses = isDemo
    ? {}
    : await getUserMatchBetStatuses(
        profile.id,
        matches.map((m) => m.id),
      );

  const eligible = filterQuickBetMatches(matches, betStatuses);

  return <QuickBetMode initialMatches={eligible} isDemo={isDemo} />;
}
