import { Suspense } from "react";
import { LeaderboardFilters } from "@/components/leaderboard/leaderboard-filters";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import type {
  League,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSort,
} from "@/types/database";

interface LeaderboardExplorerProps {
  players: LeaderboardEntry[];
  leagues: League[];
  scope: LeaderboardScope;
  leagueId: string | null;
  sort: LeaderboardSort;
  leagueName?: string | null;
}

export function LeaderboardExplorer({
  players,
  leagues,
  scope,
  leagueId,
  sort,
  leagueName,
}: LeaderboardExplorerProps) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-muted/40" />}>
        <LeaderboardFilters
          leagues={leagues}
          scope={scope}
          leagueId={leagueId}
          sort={sort}
        />
      </Suspense>

      {(scope !== "league" || leagueId) && (
        <p className="text-sm text-muted-foreground">
          {scope === "general"
            ? "Tous les joueurs"
            : leagueName
              ? `Ligue « ${leagueName} »`
              : "Ligue sélectionnée"}
          {" · "}
          {sort === "balance"
            ? "tri par bankroll"
            : sort === "classic_won"
              ? "tri par paris matchs gagnés"
              : "tri par paris fun gagnés"}
        </p>
      )}

      <LeaderboardTable players={players} highlightSort={sort} />
    </div>
  );
}
