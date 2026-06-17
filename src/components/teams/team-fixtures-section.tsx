import { NavLink } from "@/components/layout/nav-link";
import { TeamFlag } from "@/components/shared/team-flag";
import { Badge } from "@/components/ui/badge";
import { formatKickoff } from "@/lib/format";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

interface TeamFixturesSectionProps {
  teamId: number;
  liveMatches: MatchWithTeams[];
  upcomingMatches: MatchWithTeams[];
  finishedMatches: MatchWithTeams[];
}

export function TeamFixturesSection({
  teamId,
  liveMatches,
  upcomingMatches,
  finishedMatches,
}: TeamFixturesSectionProps) {
  const hasAny =
    liveMatches.length > 0 ||
    upcomingMatches.length > 0 ||
    finishedMatches.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-8 text-center">
        <h2 className="text-lg font-semibold">Calendrier</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun match programmé pour cette équipe.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Calendrier</h2>

      {liveMatches.length > 0 && (
        <FixtureBlock title="En direct" matches={liveMatches} teamId={teamId} live />
      )}
      {upcomingMatches.length > 0 && (
        <FixtureBlock title="À venir" matches={upcomingMatches} teamId={teamId} />
      )}
      {finishedMatches.length > 0 && (
        <FixtureBlock title="Résultats" matches={finishedMatches} teamId={teamId} finished />
      )}
    </section>
  );
}

function FixtureBlock({
  title,
  matches,
  teamId,
  live,
  finished,
}: {
  title: string;
  matches: MatchWithTeams[];
  teamId: number;
  live?: boolean;
  finished?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2">
        {matches.map((match) => (
          <FixtureRow
            key={match.id}
            match={match}
            teamId={teamId}
            live={live}
            finished={finished}
          />
        ))}
      </ul>
    </div>
  );
}

function FixtureRow({
  match,
  teamId,
  live,
  finished,
}: {
  match: MatchWithTeams;
  teamId: number;
  live?: boolean;
  finished?: boolean;
}) {
  const isHome = match.home_team.id === teamId;
  const opponent = isHome ? match.away_team : match.home_team;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const teamScore = isHome ? match.home_score : match.away_score;
  const oppScore = isHome ? match.away_score : match.home_score;

  let resultTone: "win" | "loss" | "draw" | null = null;
  if (finished && hasScore && teamScore != null && oppScore != null) {
    if (teamScore > oppScore) resultTone = "win";
    else if (teamScore < oppScore) resultTone = "loss";
    else resultTone = "draw";
  }

  return (
    <li>
      <NavLink
        href={`/matches/${match.id}`}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/35 px-3 py-3 transition-colors hover:border-white/10 hover:bg-zinc-900/50",
          live && "border-red-500/25 ring-1 ring-red-500/10",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {live && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                Live
              </Badge>
            )}
            {match.round && (
              <span className="text-xs text-muted-foreground">{match.round}</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <TeamFlag
              name={opponent.name}
              code={opponent.code}
              logoUrl={opponent.logo_url}
              teamId={opponent.id}
              size={24}
            />
            <span className="truncate text-sm font-medium">
              vs {tbdTeamDisplayName(opponent)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{formatKickoff(match.kickoff_at)}</p>
        </div>

        <div className="shrink-0 text-right">
          {hasScore ? (
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                resultTone === "win" && "text-green-500",
                resultTone === "loss" && "text-red-500",
                resultTone === "draw" && "text-muted-foreground",
              )}
            >
              {teamScore}
              <span className="mx-1 font-normal text-muted-foreground">–</span>
              {oppScore}
            </p>
          ) : (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {live ? "En cours" : "À venir"}
            </span>
          )}
        </div>
      </NavLink>
    </li>
  );
}
