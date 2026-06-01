"use client";

import Link from "next/link";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { LeaderboardTopCard } from "@/components/dashboard/leaderboard-top-card";
import { MatchCard } from "@/components/dashboard/match-card";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { buttonVariants } from "@/components/ui/button";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { ProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import type { DashboardStats } from "@/lib/dashboard-stats";
import type { TournamentConfig } from "@/lib/tournament/config";
import { cn } from "@/lib/utils";
import type {
  LeaderboardEntry,
  MatchWithTeams,
  Profile,
  TournamentTeam,
} from "@/types/database";

interface DashboardBentoProps {
  profile: Profile;
  stats: DashboardStats;
  teams: TournamentTeam[];
  favorite: ProfileFavoriteTeam | null;
  tournamentConfig: TournamentConfig;
  isDemo?: boolean;
  upcomingMatches: MatchWithTeams[];
  betStatuses: Record<number, UserMatchBetStatus>;
  topPlayers: LeaderboardEntry[];
}

export function DashboardBento({
  profile,
  stats,
  teams,
  favorite,
  tournamentConfig,
  isDemo,
  upcomingMatches,
  betStatuses,
  topPlayers,
}: DashboardBentoProps) {
  const [featured, ...rest] = upcomingMatches;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
      <MotionReveal index={0} className="md:col-span-12 lg:hidden">
        <DashboardSummary
          profile={profile}
          stats={stats}
          teams={teams}
          favorite={favorite}
          tournamentConfig={tournamentConfig}
          isDemo={isDemo}
        />
      </MotionReveal>

      <MotionReveal index={1} className="space-y-4 md:col-span-8 lg:col-span-8">
        <div className="hidden lg:block">
          <DashboardSummary
            profile={profile}
            stats={stats}
            teams={teams}
            favorite={favorite}
            tournamentConfig={tournamentConfig}
            isDemo={isDemo}
          />
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Prochain match
              </h2>
              <p className="text-sm text-muted-foreground">
                Coupe du Monde FIFA 2026
              </p>
            </div>
            {!isDemo && (
              <Link
                href="/matches?bets=my"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Mes pronostics
              </Link>
            )}
          </div>

          {featured ? (
            <MotionReveal index={1}>
              <MatchCard match={featured} betStatus={betStatuses[featured.id]} />
            </MotionReveal>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-900/30 p-10 text-center text-muted-foreground backdrop-blur-md">
              Aucun match à venir. Les fixtures apparaîtront ici.
            </div>
          )}

          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {rest.slice(0, 4).map((match, i) => (
                <MotionReveal key={match.id} index={i + 2}>
                  <MatchCard
                    match={match}
                    betStatus={betStatuses[match.id]}
                  />
                </MotionReveal>
              ))}
            </div>
          )}
        </section>
      </MotionReveal>

      <MotionReveal index={2} className="md:col-span-4">
        <LeaderboardTopCard players={topPlayers} isDemo={isDemo} />
      </MotionReveal>
    </div>
  );
}
