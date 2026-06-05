import Link from "next/link";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { DashboardAnnouncementBanner } from "@/components/dashboard/dashboard-announcement-banner";
import { DashboardBento } from "@/components/dashboard/dashboard-bento";
import { getUserMatchBetStatuses } from "@/lib/bets/user-match-status-query";
import { getDashboardData } from "@/lib/dashboard";
import { getGlobalLiveChatInitial } from "@/lib/global-live-chat.server";
import { DEMO_LEADERBOARD_TOP } from "@/lib/leaderboard-demo";
import {
  getLeaderboard,
  getLeaderboardRankNeighbors,
} from "@/lib/leaderboard";
import { getProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import { getAllTournamentTeams } from "@/lib/tournament/queries";
import { getTournamentConfig } from "@/lib/tournament/config";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Tableau de bord · WC2026 Pool",
  description: "Portefeuille virtuel et prochains matchs de la Coupe du Monde 2026",
};

export default async function DashboardPage() {
  const { profile, upcomingMatches, stats, isDemo } = await getDashboardData();

  const [favoriteTeam, tournamentConfig, tournamentTeams, topPlayers, rankNeighbors] =
    isDemo
      ? [
          null,
          {
            favoriteTeamBonusPoints: 100,
            worldCupWinnerTeamId: null,
            worldCupWinnerTeam: null,
            favoriteBonusSettled: false,
            dashboardAnnouncementEnabled: false,
            dashboardAnnouncementMessage: "",
          },
          [] as Awaited<ReturnType<typeof getAllTournamentTeams>>,
          DEMO_LEADERBOARD_TOP,
          getLeaderboardRankNeighbors(DEMO_LEADERBOARD_TOP, profile.id),
        ]
      : await (async () => {
          const [favoriteTeam, tournamentConfig, tournamentTeams, leaderboard] =
            await Promise.all([
              getProfileFavoriteTeam(profile.id),
              getTournamentConfig(),
              getAllTournamentTeams(),
              getLeaderboard({ sort: "points" }),
            ]);
          const players = leaderboard.players;
          return [
            favoriteTeam,
            tournamentConfig,
            tournamentTeams,
            players.slice(0, 3),
            getLeaderboardRankNeighbors(players, profile.id),
          ] as const;
        })();

  const betStatuses =
    !isDemo && upcomingMatches.length > 0
      ? await getUserMatchBetStatuses(
          profile.id,
          upcomingMatches.map((m) => m.id),
        )
      : {};

  const globalLiveChat = isDemo
    ? { messages: [], liveMatchIds: [] }
    : await getGlobalLiveChatInitial(30);

  return (
    <div className="space-y-8">
      {!isDemo && <LiveStatusPoller />}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
            Bonjour, {getPlayerLabel(profile)}
          </h1>
          {isDemo && (
            <Badge
              variant="outline"
              className="border-lime-400/40 bg-lime-400/10 text-[10px] text-lime-300"
            >
              Mode démo — configurez Supabase
            </Badge>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pariez entre amis sur la Coupe du Monde 2026 et cumulez des points selon
          les cotes.
        </p>
      </section>

      {!isDemo &&
        tournamentConfig.dashboardAnnouncementEnabled &&
        tournamentConfig.dashboardAnnouncementMessage && (
          <DashboardAnnouncementBanner
            message={tournamentConfig.dashboardAnnouncementMessage}
          />
        )}

      {!isDemo && !profile.username && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-400/30 bg-lime-400/10 px-4 py-3 backdrop-blur-md">
          <p className="text-sm">
            Choisissez un <strong>pseudo</strong> pour apparaître dans le
            classement et les matchs en direct.
          </p>
          <Link href="/profile" className={cn(buttonVariants({ size: "sm" }))}>
            Choisir mon pseudo
          </Link>
        </div>
      )}

      <DashboardBento
        profile={profile}
        stats={stats}
        teams={tournamentTeams}
        favorite={favoriteTeam}
        tournamentConfig={tournamentConfig}
        isDemo={isDemo}
        upcomingMatches={upcomingMatches}
        betStatuses={betStatuses}
        topPlayers={topPlayers}
        rankNeighbors={rankNeighbors}
        globalLiveChat={globalLiveChat}
      />
    </div>
  );
}
