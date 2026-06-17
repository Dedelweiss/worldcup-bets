import { notFound } from "next/navigation";
import { TeamFixturesSection } from "@/components/teams/team-fixtures-section";
import { TeamPageHero } from "@/components/teams/team-page-hero";
import { TeamSquadSection } from "@/components/teams/team-squad-section";
import { TeamTournamentScorersSection } from "@/components/teams/team-tournament-scorers-section";
import { requireAuth } from "@/lib/auth-server";
import { getTeamPageData } from "@/lib/tournament/team-page-data";
import { getTournamentTeamById } from "@/lib/tournament/team-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTournamentTeamById(Number(id));
  if (!team) return { title: "Équipe · WC2026 Pool" };
  return { title: `${team.name} · WC2026 Pool` };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) notFound();

  await requireAuth();

  const data = await getTeamPageData(teamId);
  if (!data) notFound();

  const {
    team,
    standing,
    upcomingMatches,
    finishedMatches,
    liveMatches,
    tournamentScorers,
  } = data;

  return (
    <div className="flex w-full flex-col gap-8">
      <TeamPageHero team={team} standing={standing} />

      <TeamSquadSection
        squad={team.squad}
        syncedAt={team.squad_synced_at}
        teamName={team.name}
        teamCode={team.code}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <TeamTournamentScorersSection
          scorers={tournamentScorers.scorers}
          syncedAt={tournamentScorers.syncedAt}
          totalGoals={tournamentScorers.totalGoals}
        />
        <TeamFixturesSection
          teamId={team.id}
          liveMatches={liveMatches}
          upcomingMatches={upcomingMatches}
          finishedMatches={finishedMatches}
        />
      </div>
    </div>
  );
}
