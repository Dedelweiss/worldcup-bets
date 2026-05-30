import { Suspense } from "react";
import { MatchesExplorer } from "@/components/matches/matches-explorer";
import { listMatchesForPlayers, getTournamentGroups } from "@/lib/tournament/queries";

export const metadata = { title: "Calendrier des matchs" };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; group?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "knockout" ? "knockout" : "group";
  const groupId = params.group ? Number(params.group) : undefined;

  const [matches, groups] = await Promise.all([
    listMatchesForPlayers({
      filter: view === "knockout" ? "knockout" : "group",
      groupId: view === "group" ? groupId : undefined,
    }),
    getTournamentGroups(),
  ]);

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
        />
      </Suspense>
    </div>
  );
}
