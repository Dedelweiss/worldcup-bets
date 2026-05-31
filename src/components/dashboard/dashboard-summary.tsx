import Link from "next/link";
import { Trophy, Zap } from "lucide-react";
import { FavoriteTeamSection } from "@/components/dashboard/favorite-team-section";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";
import { getPlayerLabel } from "@/lib/profile/player-label";
import type { ProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import type { DashboardStats } from "@/lib/dashboard-stats";
import type { TournamentConfig } from "@/lib/tournament/config";
import { cn } from "@/lib/utils";
import type { Profile, TournamentTeam } from "@/types/database";

interface DashboardSummaryProps {
  profile: Profile;
  stats: DashboardStats;
  teams: TournamentTeam[];
  favorite: ProfileFavoriteTeam | null;
  tournamentConfig: TournamentConfig;
  isDemo?: boolean;
}

function formatRank(rank: number, total: number): string {
  if (total <= 0) return "—";
  return `${rank}${rank === 1 ? "er" : "e"} / ${total}`;
}

export function DashboardSummary({
  profile,
  stats,
  teams,
  favorite,
  tournamentConfig,
  isDemo,
}: DashboardSummaryProps) {
  const secondaryStats = [
    {
      label: "Paris en cours",
      value: String(stats.pendingBets),
      hint: stats.pendingBets === 1 ? "pari en attente" : "paris en attente",
      href: isDemo ? undefined : "/bets",
    },
    {
      label: "Classement",
      value:
        stats.rank != null && stats.totalPlayers > 0
          ? formatRank(stats.rank, stats.totalPlayers)
          : "—",
      hint: "classement général",
      href: isDemo ? undefined : "/leaderboard",
    },
  ] as const;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-stretch">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Mes points
                </p>
                <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-primary">
                  {formatPoints(profile.points)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getPlayerLabel(profile)}
                </p>
              </div>
              <Trophy
                className="size-8 shrink-0 text-primary/80 lg:hidden"
                aria-hidden
              />
            </div>

            {(profile.boosts_available ?? 0) > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Zap className="size-3.5 shrink-0" aria-hidden />
                Boost x2 disponible sur un pari classique 1N2
              </p>
            )}
          </div>

          <FavoriteTeamSection
            teams={teams}
            favorite={favorite}
            config={tournamentConfig}
            isDemo={isDemo}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
          {secondaryStats.map((item) => {
            const inner = (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {item.value}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.hint}
                </p>
              </>
            );

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 transition-colors",
                    "hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <div
                key={item.label}
                className="rounded-lg border border-border/50 bg-background/50 px-3 py-2.5"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
