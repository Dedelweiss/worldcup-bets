import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { LeaderboardRankNeighbors } from "@/lib/leaderboard";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import { PlayerLeaderboardAvatar } from "@/components/leaderboard/player-leaderboard-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import { ON_FIRE_STREAK_REQUIRED } from "@/lib/on-fire";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/database";

interface LeaderboardTopCardProps {
  players: LeaderboardEntry[];
  isDemo?: boolean;
  userRank?: number | null;
  totalPlayers?: number;
  pendingBets?: number;
  rankNeighbors?: LeaderboardRankNeighbors;
}

const PODIUM_ORDER = [1, 0, 2] as const;

const pedestalStyles = [
  {
    rank: 1,
    height: "h-[5.5rem]",
    bar: "bg-gradient-to-t from-lime-500/25 via-lime-400/15 to-lime-400/5 border-lime-400/35",
    medal: "text-lime-400",
    label: "1er",
  },
  {
    rank: 2,
    height: "h-[4rem]",
    bar: "bg-gradient-to-t from-zinc-500/30 via-zinc-400/15 to-zinc-400/5 border-zinc-400/30",
    medal: "text-zinc-300",
    label: "2e",
  },
  {
    rank: 3,
    height: "h-[3rem]",
    bar: "bg-gradient-to-t from-amber-700/35 via-amber-600/15 to-amber-500/5 border-amber-600/35",
    medal: "text-amber-500",
    label: "3e",
  },
] as const;

function playerOnFire(player: LeaderboardEntry): boolean {
  return (
    Boolean(player.on_fire) ||
    (player.heat_streak ?? 0) >= ON_FIRE_STREAK_REQUIRED
  );
}

function PodiumSlot({
  player,
  rankIndex,
}: {
  player: LeaderboardEntry;
  rankIndex: 0 | 1 | 2;
}) {
  const style = pedestalStyles[rankIndex];
  const isFirst = rankIndex === 0;

  return (
    <li
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center",
        isFirst && "z-10 max-w-[38%]",
      )}
    >
      <div className="mb-1.5 flex flex-col items-center gap-1">
        {isFirst && (
          <Crown
            className="size-4 text-lime-400 drop-shadow-sm"
            aria-hidden
          />
        )}
        <PlayerLeaderboardAvatar
          player={player}
          size={isFirst ? "default" : "sm"}
          className={cn(
            isFirst && "ring-2 ring-lime-400/50 ring-offset-2 ring-offset-zinc-900",
          )}
        />
        <p className="max-w-[5.5rem] truncate text-center text-[11px] font-medium leading-tight sm:max-w-[6.5rem]">
          {getPlayerLabel(player)}
        </p>
        {player.is_ai && <AiPlayerBadge />}
        <p
          className={cn(
            "font-heading text-sm font-bold tabular-nums sm:text-base",
            style.medal,
          )}
        >
          {formatPoints(player.balance)}
        </p>
      </div>
      <div
        className={cn(
          "flex w-full items-end justify-center rounded-t-lg border border-b-0 px-1 pt-2",
          style.height,
          style.bar,
        )}
      >
        <span
          className={cn(
            "font-heading text-lg font-bold tabular-nums opacity-90",
            style.medal,
          )}
        >
          {style.label}
        </span>
      </div>
    </li>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2",
        highlight && "border-lime-400/25 bg-lime-400/5",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          highlight ? "text-lime-400" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function LeaderboardTopCard({
  players,
  isDemo,
  userRank,
  totalPlayers = 0,
  pendingBets = 0,
  rankNeighbors,
}: LeaderboardTopCardProps) {
  const podium = players.slice(0, 3);
  const leader = podium[0];
  const above = rankNeighbors?.above ?? null;
  const below = rankNeighbors?.below ?? null;
  const top3Wins = podium.reduce((s, p) => s + p.total_won, 0);
  const top3Classic = podium.reduce((s, p) => s + p.classic_won, 0);
  const onFireCount = podium.filter(playerOnFire).length;
  const bestStreak = Math.max(0, ...podium.map((p) => p.heat_streak ?? 0));

  return (
    <Card className="rounded-3xl md:self-start">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Trophy className="size-5 text-lime-400" aria-hidden />
          Podium
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {podium.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun joueur classé pour le moment.
          </p>
        ) : (
          <>
            <ol className="flex items-end justify-center gap-1.5 sm:gap-2">
              {PODIUM_ORDER.map((playerIndex) => {
                const rankIndex = playerIndex as 0 | 1 | 2;
                const player = podium[playerIndex];
                if (!player) {
                  return (
                    <li
                      key={`empty-${playerIndex}`}
                      className="flex min-w-0 flex-1 flex-col items-center opacity-30"
                      aria-hidden
                    >
                      <div className="mb-1.5 size-8 rounded-full bg-muted/40" />
                      <div
                        className={cn(
                          "w-full rounded-t-lg border border-dashed border-white/10",
                          pedestalStyles[rankIndex].height,
                        )}
                      />
                    </li>
                  );
                }
                return (
                  <PodiumSlot
                    key={player.id}
                    player={player}
                    rankIndex={rankIndex}
                  />
                );
              })}
            </ol>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                En un coup d&apos;œil
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {userRank != null && totalPlayers > 0 && (
                  <InsightRow
                    icon={Target}
                    label="Ta place"
                    value={`#${userRank} sur ${totalPlayers}`}
                    highlight={userRank <= 3}
                  />
                )}
                {above && (
                  <InsightRow
                    icon={ArrowUp}
                    label={`Devant toi · ${getPlayerLabel(above.player)}`}
                    value={
                      above.gap > 0
                        ? `${formatPoints(above.gap)} pt${above.gap > 1 ? "s" : ""} de retard`
                        : "À égalité"
                    }
                    highlight={above.gap === 0}
                  />
                )}
                {below && (
                  <InsightRow
                    icon={ArrowDown}
                    label={`Derrière toi · ${getPlayerLabel(below.player)}`}
                    value={
                      below.gap > 0
                        ? `${formatPoints(below.gap)} pt${below.gap > 1 ? "s" : ""} d'avance`
                        : "À égalité"
                    }
                    highlight={below.gap === 0}
                  />
                )}
                {userRank === 1 && leader && (
                  <InsightRow
                    icon={Crown}
                    label="Tu mènes le classement"
                    value={`${formatPoints(leader.balance)} pts`}
                    highlight
                  />
                )}
                <InsightRow
                  icon={Users}
                  label="Victoires (top 3)"
                  value={`${top3Wins} paris · ${top3Classic} classiques`}
                />
                {onFireCount > 0 && (
                  <InsightRow
                    icon={Zap}
                    label="En feu"
                    value={
                      bestStreak >= ON_FIRE_STREAK_REQUIRED
                        ? `${onFireCount} joueur${onFireCount > 1 ? "s" : ""} · série ${bestStreak}`
                        : `${onFireCount} joueur${onFireCount > 1 ? "s" : ""}`
                    }
                  />
                )}
                {pendingBets > 0 && (
                  <InsightRow
                    icon={Target}
                    label="Tes paris en cours"
                    value={`${pendingBets} en attente`}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {!isDemo && (
          <Link
            href="/leaderboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
          >
            Voir le classement complet
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
