import Link from "next/link";
import { Suspense } from "react";
import { LeagueInvitePanel } from "@/components/leagues/league-invite-panel";
import { LeaderboardFilters } from "@/components/leaderboard/leaderboard-filters";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import type { LeagueWithMeta } from "@/lib/leagues";
import type {
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSort,
} from "@/types/database";

interface LeaderboardExplorerProps {
  players: LeaderboardEntry[];
  leagues: LeagueWithMeta[];
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

      {scope === "league" && leagues.length === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous n&apos;êtes dans aucune ligue. Rejoignez-en une avec un code ou{" "}
            <Link href="/leagues" className="text-primary underline">
              gérez vos ligues
            </Link>
            .
          </p>
          <LeagueInvitePanel myLeagues={[]} />
        </div>
      )}

      {scope === "league" && leagues.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Code d&apos;invitation : voir{" "}
          <Link href="/leagues" className="text-primary underline">
            Mes ligues
          </Link>{" "}
          pour inviter des amis.
        </p>
      )}

      {(scope !== "league" || leagueId) && (
        <p className="text-sm text-muted-foreground">
          {scope === "general"
            ? "Tous les joueurs"
            : leagueName
              ? `Ligue « ${leagueName} »`
              : "Ligue sélectionnée"}
          {" · "}
          {sort === "points"
            ? "tri par points"
            : sort === "classic_won"
              ? "tri par paris matchs gagnés"
              : "tri par paris fun gagnés"}
        </p>
      )}

      <LeaderboardTable players={players} highlightSort={sort} />
    </div>
  );
}
