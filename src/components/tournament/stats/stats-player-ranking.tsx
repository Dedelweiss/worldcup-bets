import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import type { TournamentScorer } from "@/types/database";
import { Goal, Sparkles } from "lucide-react";

type PlayerMetric = "goals" | "assists";

interface StatsPlayerRankingProps {
  players: TournamentScorer[];
  metric: PlayerMetric;
  emptyMessage?: string;
}

function metricValue(player: TournamentScorer, metric: PlayerMetric): number {
  return metric === "goals" ? player.goals : (player.assists ?? 0);
}

const metricConfig = {
  goals: {
    icon: Goal,
    label: "but",
    labelPlural: "buts",
    accent: "text-amber-400",
    bar: "bg-gradient-to-r from-amber-500 to-amber-400",
    podium: ["bg-amber-400/25 ring-amber-400/40", "bg-zinc-400/20 ring-zinc-400/30", "bg-orange-600/20 ring-orange-500/30"],
  },
  assists: {
    icon: Sparkles,
    label: "passe D",
    labelPlural: "passes D",
    accent: "text-violet-400",
    bar: "bg-gradient-to-r from-violet-500 to-violet-400",
    podium: ["bg-violet-400/25 ring-violet-400/40", "bg-zinc-400/20 ring-zinc-400/30", "bg-indigo-600/20 ring-indigo-500/30"],
  },
} as const;

function PodiumCard({
  player,
  rank,
  metric,
  max,
}: {
  player: TournamentScorer;
  rank: 1 | 2 | 3;
  metric: PlayerMetric;
  max: number;
}) {
  const cfg = metricConfig[metric];
  const value = metricValue(player, metric);
  const Icon = cfg.icon;
  const heights = { 1: "pt-6", 2: "pt-10", 3: "pt-12" };
  const order = { 1: "order-2", 2: "order-1", 3: "order-3" };

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center text-center",
        order[rank],
        heights[rank],
      )}
    >
      <div
        className={cn(
          "mb-2 flex size-9 items-center justify-center rounded-full text-sm font-black ring-2",
          cfg.podium[rank - 1],
        )}
      >
        {rank}
      </div>
      <TeamFlag
        name={player.teamName}
        code={player.teamTla}
        size={rank === 1 ? 40 : 32}
        className="shadow-lg ring-2 ring-white/10"
      />
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight [overflow-wrap:anywhere]">
        {player.playerName}
      </p>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
        {player.teamName}
      </p>
      <p className={cn("mt-2 flex items-center gap-1 text-xl font-black tabular-nums", cfg.accent)}>
        <Icon className="size-4 opacity-80" aria-hidden />
        {value}
      </p>
      <div className="mt-2 h-1.5 w-full max-w-[88px] overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-all", cfg.bar)}
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

function RankingRow({
  player,
  rank,
  metric,
  max,
}: {
  player: TournamentScorer;
  rank: number;
  metric: PlayerMetric;
  max: number;
}) {
  const cfg = metricConfig[metric];
  const value = metricValue(player, metric);
  const Icon = cfg.icon;

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-white/[0.06] hover:bg-white/[0.03]">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <TeamFlag
        name={player.teamName}
        code={player.teamTla}
        size={28}
        className="shrink-0 ring-1 ring-white/10"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{player.playerName}</p>
        <p className="truncate text-xs text-muted-foreground">{player.teamName}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full", cfg.bar)}
            style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
          />
        </div>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-lg font-bold tabular-nums",
          cfg.accent,
        )}
      >
        <Icon className="size-3.5 opacity-70" aria-hidden />
        {value}
      </span>
    </li>
  );
}

export function StatsPlayerRanking({
  players,
  metric,
  emptyMessage = "Aucune donnée pour le moment.",
}: StatsPlayerRankingProps) {
  const cfg = metricConfig[metric];

  if (!players.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const max = metricValue(players[0], metric);
  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="space-y-5">
      {podium.length >= 2 ? (
        <div className="flex items-end justify-center gap-2 border-b border-white/[0.06] pb-5 sm:gap-4">
          {podium[1] ? (
            <PodiumCard player={podium[1]} rank={2} metric={metric} max={max} />
          ) : null}
          {podium[0] ? (
            <PodiumCard player={podium[0]} rank={1} metric={metric} max={max} />
          ) : null}
          {podium[2] ? (
            <PodiumCard player={podium[2]} rank={3} metric={metric} max={max} />
          ) : (
            <div className="hidden flex-1 sm:block" />
          )}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <ol className="space-y-0.5">
          {rest.map((player, i) => (
            <RankingRow
              key={player.playerId}
              player={player}
              rank={i + 4}
              metric={metric}
              max={max}
            />
          ))}
        </ol>
      ) : podium.length === 1 ? (
        <RankingRow player={podium[0]} rank={1} metric={metric} max={max} />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        {players.length} joueur{players.length > 1 ? "s" : ""} · classement par{" "}
        {cfg.labelPlural}
      </p>
    </div>
  );
}
