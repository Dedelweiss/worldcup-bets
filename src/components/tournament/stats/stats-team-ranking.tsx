import Link from "next/link";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import type { TeamStatRow } from "@/lib/tournament/tournament-stats-data";
import { Goal, Sparkles } from "lucide-react";

type TeamMetric = "goals" | "assists";

interface StatsTeamRankingProps {
  teams: TeamStatRow[];
  metric: TeamMetric;
  teamMeta?: Map<number, { code: string | null; logoUrl: string | null }>;
  emptyMessage?: string;
}

const metricConfig = {
  goals: {
    icon: Goal,
    accent: "text-amber-400",
    bar: "bg-gradient-to-r from-amber-500/90 to-amber-300/80",
  },
  assists: {
    icon: Sparkles,
    accent: "text-violet-400",
    bar: "bg-gradient-to-r from-violet-500/90 to-violet-300/80",
  },
} as const;

export function StatsTeamRanking({
  teams,
  metric,
  teamMeta,
  emptyMessage = "Aucune donnée pour le moment.",
}: StatsTeamRankingProps) {
  const cfg = metricConfig[metric];

  if (!teams.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const max = metric === "goals" ? teams[0].goals : teams[0].assists;
  const Icon = cfg.icon;

  return (
    <ol className="space-y-2">
      {teams.map((team, index) => {
        const value = metric === "goals" ? team.goals : team.assists;
        const meta = team.localTeamId
          ? teamMeta?.get(team.localTeamId)
          : undefined;
        const isLeader = index === 0;

        const row = (
          <>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
                isLeader
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <TeamFlag
              name={team.teamName}
              code={meta?.code ?? team.teamTla}
              logoUrl={meta?.logoUrl}
              teamId={team.localTeamId ?? undefined}
              size={32}
              className="shrink-0 ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold">{team.teamName}</p>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 text-base font-bold tabular-nums",
                    cfg.accent,
                  )}
                >
                  <Icon className="size-3.5 opacity-70" aria-hidden />
                  {value}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn("h-full rounded-full transition-all", cfg.bar)}
                  style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
                />
              </div>
              {max > 0 && index > 0 ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {Math.round((value / max) * 100)} % du leader
                </p>
              ) : null}
            </div>
          </>
        );

        return (
          <li key={team.teamFootballDataId}>
            {team.localTeamId ? (
              <Link
                href={`/teams/${team.localTeamId}`}
                className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-3 transition-all hover:border-white/10 hover:bg-white/[0.04]"
              >
                {row}
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-3">
                {row}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
