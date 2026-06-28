import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  MatchesExplorer,
  type MatchBetFilter,
} from "@/components/matches/matches-explorer";
import { FillRandomScoresButton } from "@/components/bets/fill-random-scores-button";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";
import { requireAuth } from "@/lib/auth-server";
import { getMatchesWithoutClassicBet } from "@/lib/bets/eligible-classic-bets";
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
  const groupId = params.group ? Number(params.group) : undefined;
  const betFilter = parseBetFilterParam(params.bets);
  const explicitView =
    params.view === "knockout"
      ? "knockout"
      : params.view === "group"
        ? "group"
        : null;

  const [groupMatches, knockoutMatches, groups, missingClassic] =
    await Promise.all([
      listMatchesForPlayers({
        filter: "group",
        groupId: explicitView !== "knockout" ? groupId : undefined,
      }),
      listMatchesForPlayers({ filter: "knockout" }),
      getTournamentGroups(),
      getMatchesWithoutClassicBet(profile.id),
    ]);

  if (
    explicitView == null &&
    groupMatches.length === 0 &&
    knockoutMatches.length > 0
  ) {
    const next = new URLSearchParams();
    next.set("view", "knockout");
    if (params.bets) next.set("bets", params.bets);
    redirect(`/matches?${next.toString()}`);
  }

  const view = explicitView ?? "group";
  const matches = view === "knockout" ? knockoutMatches : groupMatches;

  const betStatuses =
    matches.length > 0
      ? await getUserMatchBetStatuses(
          profile.id,
          matches.map((m) => m.id),
        )
      : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Calendrier
          </h1>
          <p className="text-muted-foreground">
            Matchs à venir et en direct — filtres par poules ou phase finale.
          </p>
        </div>
        <FillRandomScoresButton missingCount={missingClassic.length} />
      </div>

      <Suspense fallback={<PageLoadingSkeleton />}>
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
