import { Suspense } from "react";
import {
  MatchesExplorer,
  type MatchBetFilter,
} from "@/components/matches/matches-explorer";
import { requireAuth } from "@/lib/auth-server";
import { getUserMatchBetStatuses } from "@/lib/bets/user-match-status-query";
import { listMatchesForPlayers, getTournamentGroups } from "@/lib/tournament/queries";

export const metadata = { title: "Calendrier des matchs" };

function parseBetFilterParam(value?: string): MatchBetFilter {
  if (value === "my") return "my-bets";
  if (value === "fun") return "fun-pending";
  return "all";
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; group?: string; bets?: string }>;
}) {
  const profile = await requireAuth();
  const params = await searchParams;
  const view = params.view === "knockout" ? "knockout" : "group";
  const groupId = params.group ? Number(params.group) : undefined;
  const betFilter = parseBetFilterParam(params.bets);

  const [matches, groups] = await Promise.all([
    listMatchesForPlayers({
      filter: view === "knockout" ? "knockout" : "group",
      groupId: view === "group" ? groupId : undefined,
    }),
    getTournamentGroups(),
  ]);

  const betStatuses = await getUserMatchBetStatuses(
    profile.id,
    matches.map((m) => m.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendrier</h1>
        <p className="text-muted-foreground">
          Matchs à venir et en direct — filtres par poules ou phase finale.
        </p>
      </div>

      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <MatchesExplorer
          matches={matches}
          groups={groups}
          initialFilter={view}
          initialGroupId={groupId}
          initialBetFilter={betFilter}
          betStatuses={betStatuses}
        />
      </Suspense>
    </div>
  );
}
