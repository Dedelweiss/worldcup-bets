import Link from "next/link";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { UpcomingMatches } from "@/components/dashboard/upcoming-matches";
import { getUserMatchBetStatuses } from "@/lib/bets/user-match-status-query";
import { getDashboardData } from "@/lib/dashboard";
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

  const [favoriteTeam, tournamentConfig, tournamentTeams] = isDemo
    ? [null, { favoriteTeamBonusPoints: 100, worldCupWinnerTeamId: null, worldCupWinnerTeam: null, favoriteBonusSettled: false }, [] as Awaited<ReturnType<typeof getAllTournamentTeams>>]
    : await Promise.all([
        getProfileFavoriteTeam(profile.id),
        getTournamentConfig(),
        getAllTournamentTeams(),
      ]);

  const betStatuses =
    !isDemo && upcomingMatches.length > 0
      ? await getUserMatchBetStatuses(
          profile.id,
          upcomingMatches.map((m) => m.id),
        )
      : {};

  return (
    <div className="space-y-8">
      {!isDemo && <LiveStatusPoller />}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {getPlayerLabel(profile)}
          </h1>
          {isDemo && (
            <Badge variant="outline" className="text-[10px]">
              Mode démo — configurez Supabase
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Pariez entre amis sur la Coupe du Monde 2026 et cumulez des points selon les cotes.
        </p>
      </section>

      {!isDemo && !profile.username && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm">
            Choisissez un <strong>pseudo</strong> pour apparaître dans le
            classement et les matchs en direct.
          </p>
          <Link href="/profile" className={cn(buttonVariants({ size: "sm" }))}>
            Choisir mon pseudo
          </Link>
        </div>
      )}

      <DashboardSummary
        profile={profile}
        stats={stats}
        teams={tournamentTeams}
        favorite={favoriteTeam}
        tournamentConfig={tournamentConfig}
        isDemo={isDemo}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Prochains matchs</h2>
            <p className="text-sm text-muted-foreground">
              Coupe du Monde FIFA 2026 · Paris 1N2
            </p>
          </div>
          {!isDemo && (
            <Link
              href="/matches?bets=my"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
              )}
            >
              Mes pronostics
            </Link>
          )}
        </div>
        {upcomingMatches.length === 0 && !isDemo ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Aucun match à venir. Un administrateur peut en créer depuis{" "}
            <strong className="text-foreground">/admin</strong>.
          </p>
        ) : (
          <UpcomingMatches
            matches={upcomingMatches}
            betStatuses={betStatuses}
          />
        )}
      </section>
    </div>
  );
}
