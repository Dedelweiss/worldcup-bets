import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

type Team = MatchWithTeams["home_team"];

function TeamLogo({ team, className }: { team: Team; className?: string }) {
  if (team.logo_url) {
    return (
      <Image
        src={team.logo_url}
        alt=""
        width={36}
        height={36}
        className={cn("size-9 rounded-full bg-muted object-contain p-0.5", className)}
        unoptimized
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-muted text-xs font-bold",
        className,
      )}
    >
      {team.code ?? "?"}
    </span>
  );
}

interface MatchScoreInlineProps {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  isLive?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

/** Score centré, logos proches — noms en dessous. */
export function MatchScoreInline({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  isLive = false,
  size = "sm",
  className,
}: MatchScoreInlineProps) {
  const hasScore = homeScore !== null && awayScore !== null;
  const scoreClass =
    size === "lg"
      ? "text-4xl font-bold tabular-nums sm:text-5xl"
      : "text-2xl font-bold tabular-nums leading-none";

  if (!hasScore) {
    return (
      <div className={cn("flex items-center justify-center gap-3", className)}>
        <TeamLogo team={homeTeam} />
        <span className="text-lg font-semibold text-muted-foreground">vs</span>
        <TeamLogo team={awayTeam} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <TeamLogo team={homeTeam} />
        <div className="min-w-[4.5rem] text-center">
          <p className={scoreClass}>
            {homeScore}
            <span className="mx-0.5 font-normal text-muted-foreground">-</span>
            {awayScore}
          </p>
          {isLive && size === "sm" && (
            <p className="mt-0.5 text-[10px] font-medium text-primary">En cours</p>
          )}
        </div>
        <TeamLogo team={awayTeam} />
      </div>
      <div className="flex w-full max-w-[min(100%,280px)] justify-between gap-6 px-1 text-[11px] text-muted-foreground sm:text-xs">
        <span className="max-w-[42%] truncate text-right">{homeTeam.name}</span>
        <span className="max-w-[42%] truncate text-left">{awayTeam.name}</span>
      </div>
    </div>
  );
}
