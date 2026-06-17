import { TeamFlag } from "@/components/shared/team-flag";
import { TeamNavLink } from "@/components/shared/team-nav-link";
import { TournamentScorersList } from "@/components/tournament/tournament-scorers-list";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { MatchWithTeams, TournamentScorer } from "@/types/database";

interface MatchTournamentScorersSectionProps {
  match: MatchWithTeams;
  homeScorers: TournamentScorer[];
  awayScorers: TournamentScorer[];
  syncedAt: string | null;
}

export function MatchTournamentScorersSection({
  match,
  homeScorers,
  awayScorers,
  syncedAt,
}: MatchTournamentScorersSectionProps) {
  const hasAny = homeScorers.length > 0 || awayScorers.length > 0;

  if (!hasAny) {
    return (
      <section
        id="buteurs"
        className="scroll-mt-28 rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-6 text-center md:scroll-mt-32"
      >
        <h2 className="text-lg font-semibold">Buteurs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Classement buteurs du tournoi non synchronisé, ou aucun but pour ces
          équipes pour le moment.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/80">
          L&apos;API gratuite football-data.org ne fournit pas le détail but par
          but de chaque match (option Deep Data payante).
        </p>
      </section>
    );
  }

  return (
    <section id="buteurs" className="scroll-mt-28 space-y-5 md:scroll-mt-32">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Buteurs au tournoi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Totaux cumulés à la Coupe du monde pour les deux équipes (pas le
          fil chronologique de ce match).
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TeamScorersBlock
          team={match.home_team}
          scorers={homeScorers}
          syncedAt={syncedAt}
        />
        <TeamScorersBlock
          team={match.away_team}
          scorers={awayScorers}
          syncedAt={syncedAt}
        />
      </div>
    </section>
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
      <TeamNavLink team={team} className="flex items-center gap-2.5">
        <TeamFlag
          name={team.name}
          code={team.code}
          logoUrl={team.logo_url}
          teamId={team.id}
          size={28}
        />
        <h3 className="font-semibold">{tbdTeamDisplayName(team)}</h3>
      </TeamNavLink>
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
