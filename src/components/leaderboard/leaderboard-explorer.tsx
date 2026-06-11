import Link from "next/link";
import { Suspense } from "react";
import { ExportLeaderboardButton } from "@/components/leaderboard/export-leaderboard-button";
import { LeagueInvitePanel } from "@/components/leagues/league-invite-panel";
import { LeaderboardFilters } from "@/components/leaderboard/leaderboard-filters";
import { LeaderboardFutCardProvider } from "@/components/leaderboard/leaderboard-fut-card-context";
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
  const showTable = scope !== "league" || Boolean(leagueId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Suspense
          fallback={<div className="h-28 flex-1 animate-pulse rounded-xl bg-muted/40" />}
        >
          <LeaderboardFilters
            leagues={leagues}
            scope={scope}
            leagueId={leagueId}
            sort={sort}
          />
        </Suspense>
        {showTable && players.length > 0 && (
          <ExportLeaderboardButton
            players={players}
            scope={scope}
            sort={sort}
            leagueName={leagueName}
            className="w-full shrink-0 sm:w-auto"
          />
        )}
      </div>

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

      {players.some((p) => (p.live_points ?? 0) > 0) && (
        <p className="rounded-lg border border-lime-400/25 bg-lime-400/10 px-4 py-3 text-sm text-lime-200/90">
          Match(s) en direct — le suffixe{" "}
          <span className="font-semibold text-lime-300">+pts</span> est provisoire
          et peut changer si le score évolue. Les points ne sont crédités qu&apos;à
          la fin du match.
        </p>
      )}

      {showTable && (
        <p className="text-sm text-muted-foreground">
          {scope === "general"
            ? "Tous les joueurs"
            : leagueName
              ? `Ligue « ${leagueName} »`
              : "Ligue sélectionnée"}
          {" · "}
          {sort === "points"
            ? "tri par points confirmés"
            : sort === "live_points"
              ? "tri par points + gains provisoires (matchs en direct)"
              : sort === "classic_won"
                ? "tri par paris matchs gagnés"
                : "tri par paris fun gagnés"}
        </p>
      )}

      <LeaderboardFutCardProvider>
        <p className="text-xs text-muted-foreground">
          Astuce : cliquez sur un joueur pour révéler sa carte pronostiqueur.
        </p>
        <LeaderboardTable
          players={players}
          highlightSort={sort}
          showOnFire={scope === "general"}
        />
      </LeaderboardFutCardProvider>
    </div>
  );
}
