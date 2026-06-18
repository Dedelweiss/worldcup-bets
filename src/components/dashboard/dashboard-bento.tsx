"use client";

import Link from "next/link";
import { GlobalLiveChat } from "@/components/chat/global-live-chat";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { ExpertiseRadarCard } from "@/components/dashboard/expertise-radar-card";
import { LeaderboardTopCard } from "@/components/dashboard/leaderboard-top-card";
import { MatchCard } from "@/components/dashboard/match-card";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { buttonVariants } from "@/components/ui/button";
import type { GlobalLiveChatInitial } from "@/lib/global-live-chat";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { ProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import type { DashboardStats } from "@/lib/dashboard-stats";
import type { TournamentConfig } from "@/lib/tournament/config";
import { cn } from "@/lib/utils";
import type { ExpertiseRadarData } from "@/lib/dashboard/expertise-radar";
import type { LeaderboardRankNeighbors } from "@/lib/leaderboard";
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
  selectionOpen?: boolean;
  isDemo?: boolean;
  upcomingMatches: MatchWithTeams[];
  betStatuses: Record<number, UserMatchBetStatus>;
  topPlayers: LeaderboardEntry[];
  rankNeighbors: LeaderboardRankNeighbors;
  globalLiveChat: GlobalLiveChatInitial;
  expertiseRadar: ExpertiseRadarData;
}

export function DashboardBento({
  profile,
  stats,
  teams,
  favorite,
  tournamentConfig,
  selectionOpen,
  isDemo,
  upcomingMatches,
  betStatuses,
  topPlayers,
  rankNeighbors,
  globalLiveChat,
  expertiseRadar,
}: DashboardBentoProps) {
  const [featured, ...rest] = upcomingMatches;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      {/* Summary: rendered ONCE. Full width on mobile, left column on desktop. */}
      <MotionReveal index={0} className="order-1 lg:col-span-8">
        <DashboardSummary
          profile={profile}
          stats={stats}
          teams={teams}
          favorite={favorite}
          tournamentConfig={tournamentConfig}
          selectionOpen={selectionOpen}
          isDemo={isDemo}
        />
      </MotionReveal>

      {/* Right column: leaderboard, chat, radar. Spans both summary + matches rows on desktop. */}
      <div className="order-3 space-y-4 lg:order-2 lg:col-span-4 lg:row-span-2">
        <MotionReveal index={1}>
          <LeaderboardTopCard
            players={topPlayers}
            isDemo={isDemo}
            userRank={stats.rank}
            totalPlayers={stats.totalPlayers}
            pendingBets={stats.pendingBets}
            rankNeighbors={rankNeighbors}
          />
        </MotionReveal>
        {!isDemo && (
          <MotionReveal index={2}>
            <GlobalLiveChat
              initialMessages={globalLiveChat.messages}
              initialLiveMatchIds={globalLiveChat.liveMatchIds}
            />
          </MotionReveal>
        )}
        <MotionReveal index={3}>
          <ExpertiseRadarCard
            data={expertiseRadar.axes}
            hasData={expertiseRadar.hasData}
            ovr={expertiseRadar.ovr}
            isDemo={isDemo}
          />
        </MotionReveal>
      </div>

      {/* Matches block: under the summary in the left column. */}
      <section className="order-2 space-y-3 lg:order-3 lg:col-span-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight">
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
          <MotionReveal index={4}>
            <MatchCard match={featured} betStatus={betStatuses[featured.id]} />
          </MotionReveal>
        ) : (
          <div className="rounded-[var(--radius-modal)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)]/40 p-10 text-center text-muted-foreground">
            Aucun match à venir. Les fixtures apparaîtront ici.
          </div>
        )}

        {rest.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.slice(0, 4).map((match, i) => (
              <MotionReveal key={match.id} index={5 + i}>
                <MatchCard match={match} betStatus={betStatuses[match.id]} />
              </MotionReveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
