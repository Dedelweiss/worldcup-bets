import { HeroTeamBlock } from "@/components/matches/hero-team-block";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { MatchWithTeams } from "@/types/database";

type Team = MatchWithTeams["home_team"];

const FLAG_SIZE = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

function TeamLogo({
  team,
  size,
  className,
}: {
  team: Team;
  size: number;
  className?: string;
}) {
  return (
    <TeamFlag
      name={team.name}
      code={team.code}
      logoUrl={team.logo_url}
      teamId={team.id}
      size={size}
      className={className}
    />
  );
}

function HeroScoreCenter({
  homeScore,
  awayScore,
  hasScore,
}: {
  homeScore: number | null;
  awayScore: number | null;
  hasScore: boolean;
}) {
  if (!hasScore) {
    return (
      <div className="flex shrink-0 items-center justify-center px-2 sm:px-4">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground sm:text-sm">
          vs
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center justify-center px-1 sm:px-4">
      <p className="text-3xl font-bold tabular-nums tracking-tight sm:text-5xl md:text-6xl">
        {homeScore}
        <span className="mx-1 font-normal text-muted-foreground sm:mx-2">–</span>
        {awayScore}
      </p>
    </div>
  );
}

function HeroScoreboard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  className,
}: {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  className?: string;
}) {
  const hasScore = homeScore !== null && awayScore !== null;

  return (
    <div className={cn("w-full max-w-3xl", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-8 md:gap-12">
        <HeroTeamBlock team={homeTeam} side="home" />
        <HeroScoreCenter
          homeScore={homeScore}
          awayScore={awayScore}
          hasScore={hasScore}
        />
        <HeroTeamBlock team={awayTeam} side="away" />
      </div>
    </div>
  );
}

interface MatchScoreInlineProps {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "hero";
  className?: string;
}

/** Score centré, logos proches — noms en dessous. */
export function MatchScoreInline({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  size = "sm",
  variant = "default",
  className,
}: MatchScoreInlineProps) {
  const hasScore = homeScore !== null && awayScore !== null;
  const flagSize = FLAG_SIZE[size];

  if (variant === "hero") {
    return (
      <HeroScoreboard
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        className={className}
      />
    );
  }

  const scoreClass =
    size === "lg"
      ? "text-4xl font-bold tabular-nums sm:text-5xl"
      : size === "md"
        ? "text-3xl font-bold tabular-nums sm:text-4xl"
        : "text-2xl font-bold tabular-nums leading-none";

  if (!hasScore) {
    return (
      <div className={cn("flex items-center justify-center gap-3", className)}>
        <TeamLogo team={homeTeam} size={flagSize} />
        <span className="text-lg font-semibold text-muted-foreground">vs</span>
        <TeamLogo team={awayTeam} size={flagSize} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <TeamLogo team={homeTeam} size={flagSize} />
        <div className="min-w-[4.5rem] text-center">
          <p className={scoreClass}>
            {homeScore}
            <span className="mx-0.5 font-normal text-muted-foreground">-</span>
            {awayScore}
          </p>
        </div>
        <TeamLogo team={awayTeam} size={flagSize} />
      </div>
      <div className="flex w-full max-w-[min(100%,280px)] justify-between gap-6 px-1 text-[11px] text-muted-foreground sm:text-xs">
        <span className="max-w-[42%] truncate text-right">
          {tbdTeamDisplayName(homeTeam)}
        </span>
        <span className="max-w-[42%] truncate text-left">
          {tbdTeamDisplayName(awayTeam)}
        </span>
      </div>
    </div>
  );
}
