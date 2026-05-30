import { LeaderboardExplorer } from "@/components/leaderboard/leaderboard-explorer";
import { requireAuth, hasSupabaseConfig } from "@/lib/auth-server";
import { getLeaderboard, parseLeaderboardSort } from "@/lib/leaderboard";
import { getLeagueById, getLeaguesForUser } from "@/lib/leagues";
import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import type { LeaderboardEntry, LeaderboardScope } from "@/types/database";

export const metadata = { title: "Classement · WC2026 Pool" };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; league?: string; sort?: string }>;
}) {
  const profile = await requireAuth();
  const params = await searchParams;

  const sort = parseLeaderboardSort(params.sort);
  const scope: LeaderboardScope =
    params.scope === "league" ? "league" : "general";

  let leagues = hasSupabaseConfig ? await getLeaguesForUser(profile.id) : [];
  let leagueId: string | null =
    scope === "league" ? (params.league ?? leagues[0]?.id ?? null) : null;

  if (scope === "league" && leagueId && !leagues.some((l) => l.id === leagueId)) {
    leagueId = leagues[0]?.id ?? null;
  }

  let players: LeaderboardEntry[] = [];
  let warning: string | undefined;
  let leagueName: string | null = null;

  if (hasSupabaseConfig) {
    const result = await getLeaderboard({
      leagueId: scope === "league" ? leagueId : null,
      sort,
    });
    players = result.players;
    warning = result.warning;

    if (leagueId) {
      const league = await getLeagueById(leagueId);
      leagueName = league?.name ?? null;
    }
  } else {
    const { profile: mockProfile } = MOCK_DASHBOARD;
    players = [
      {
        id: mockProfile.id,
        display_name: mockProfile.display_name,
        username: mockProfile.username,
        balance: mockProfile.balance,
        classic_won: 0,
        classic_lost: 0,
        fun_won: 0,
        fun_lost: 0,
        total_won: 0,
        total_lost: 0,
      },
    ];
    leagues = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Classement</h1>
        <p className="text-sm text-muted-foreground">
          Filtrez par ligue et par type de performance — les critères se cumulent.
        </p>
      </div>
      {warning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {warning}
        </p>
      )}
      <LeaderboardExplorer
        players={players}
        leagues={leagues}
        scope={scope}
        leagueId={leagueId}
        sort={sort}
        leagueName={leagueName}
      />
    </div>
  );
}
