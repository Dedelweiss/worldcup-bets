import { TeamFixtureRow } from "@/components/teams/team-fixture-row";
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
          <TeamFixtureRow
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
