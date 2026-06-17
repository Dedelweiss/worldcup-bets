import { TeamFlag } from "@/components/shared/team-flag";
import { TournamentScorersList } from "@/components/tournament/tournament-scorers-list";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type {
  MatchGoalEvent,
  MatchGoalEventsSource,
  MatchWithTeams,
  TournamentScorer,
} from "@/types/database";

interface MatchGoalEventsSectionProps {
  match: MatchWithTeams;
  goalEvents: MatchGoalEvent[];
  goalEventsSyncedAt: string | null;
  goalEventsSource: MatchGoalEventsSource | null;
  homeScorers: TournamentScorer[];
  awayScorers: TournamentScorer[];
  tournamentScorersSyncedAt: string | null;
}

export function MatchGoalEventsSection({
  match,
  goalEvents,
  goalEventsSyncedAt,
  goalEventsSource,
  homeScorers,
  awayScorers,
  tournamentScorersSyncedAt,
}: MatchGoalEventsSectionProps) {
  const hasTimeline = goalEvents.length > 0;
  const hasTournament =
    homeScorers.length > 0 || awayScorers.length > 0;

  if (!hasTimeline && !hasTournament) {
    return (
      <section
        id="buteurs"
        className="scroll-mt-28 rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-6 text-center md:scroll-mt-32"
      >
        <h2 className="text-lg font-semibold">Buteurs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le détail des buts sera affiché ici après synchronisation (cron ou
          admin).
        </p>
      </section>
    );
  }

  return (
    <section id="buteurs" className="scroll-mt-28 space-y-6 md:scroll-mt-32">
      {hasTimeline && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Buts du match</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chronologie minute par minute
              {goalEventsSource === "wikipedia" && " · source Wikipedia"}
              {goalEventsSource === "native-stats" && " · source native-stats.org"}
            </p>
          </div>
          <GoalTimeline match={match} events={goalEvents} syncedAt={goalEventsSyncedAt} />
        </div>
      )}

      {hasTournament && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {hasTimeline ? "Buteurs au tournoi" : "Buteurs"}
            </h2>
            {!hasTimeline && (
              <p className="mt-1 text-sm text-muted-foreground">
                Totaux cumulés à la Coupe du monde pour les deux équipes.
              </p>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <TeamScorersBlock
              team={match.home_team}
              scorers={homeScorers}
              syncedAt={tournamentScorersSyncedAt}
            />
            <TeamScorersBlock
              team={match.away_team}
              scorers={awayScorers}
              syncedAt={tournamentScorersSyncedAt}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function GoalTimeline({
  match,
  events,
  syncedAt,
}: {
  match: MatchWithTeams;
  events: MatchGoalEvent[];
  syncedAt: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/30">
      <ol className="divide-y divide-white/[0.06]">
        {events.map((event, index) => {
          const team =
            event.teamSide === "home" ? match.home_team : match.away_team;
          return (
            <li
              key={`${event.minuteSort}-${event.scorerName}-${index}`}
              className="flex items-start gap-3 px-4 py-3 sm:gap-4 sm:px-5"
            >
              <span className="w-10 shrink-0 pt-0.5 text-right font-mono text-sm font-semibold tabular-nums text-primary">
                {event.minute}&apos;
              </span>
              <TeamFlag
                name={team.name}
                code={team.code}
                logoUrl={team.logo_url}
                teamId={team.id}
                size={24}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">
                  {event.scorerName}
                  {event.type === "penalty" && (
                    <GoalTypeBadge label="pen." />
                  )}
                  {event.type === "own_goal" && (
                    <GoalTypeBadge label="c.s.c." />
                  )}
                </p>
                {event.assistName && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Passe : {event.assistName}
                  </p>
                )}
              </div>
              {event.scoreAfter && (
                <span className="shrink-0 pt-0.5 font-mono text-sm tabular-nums text-muted-foreground">
                  {event.scoreAfter.home}–{event.scoreAfter.away}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {syncedAt && (
        <p className="border-t border-white/[0.06] px-4 py-2 text-xs text-muted-foreground/70">
          Mis à jour {new Date(syncedAt).toLocaleString("fr-FR")}
        </p>
      )}
    </div>
  );
}

function GoalTypeBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        "bg-white/10 text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function TeamScorersBlock({
  team,
  scorers,
  syncedAt,
}: {
  team: MatchWithTeams["home_team"];
  scorers: TournamentScorer[];
  syncedAt: string | null;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-4">
      <div className="flex items-center gap-2.5">
        <TeamFlag
          name={team.name}
          code={team.code}
          logoUrl={team.logo_url}
          teamId={team.id}
          size={28}
        />
        <h3 className="font-semibold">{tbdTeamDisplayName(team)}</h3>
      </div>
      <TournamentScorersList
        scorers={scorers}
        syncedAt={syncedAt}
        title=""
        compact
        emptyMessage="Aucun buteur pour cette sélection."
      />
    </div>
  );
}
