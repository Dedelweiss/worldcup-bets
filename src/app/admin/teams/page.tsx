import Link from "next/link";
import { WorldCupWinnerPanel } from "@/components/admin/world-cup-winner-panel";
import { TournamentTeamsForm } from "@/components/admin/tournament-teams-form";
import { getAllTournamentTeams } from "@/lib/tournament/queries";
import { getTournamentConfig } from "@/lib/tournament/config";
import {
  getTeamsByTournamentGroup,
  getTournamentGroups,
} from "@/lib/tournament/queries";

export const metadata = { title: "Admin · Équipes & groupes" };

export default async function AdminTeamsPage() {
  const [groups, tournamentTeams, tournamentConfig] = await Promise.all([
    getTournamentGroups(),
    getAllTournamentTeams(),
    getTournamentConfig(),
  ]);
  const teamsByGroup: Record<number, Awaited<ReturnType<typeof getTeamsByTournamentGroup>>> =
    {};

  await Promise.all(
    groups.map(async (g) => {
      teamsByGroup[g.id] = await getTeamsByTournamentGroup(g.id);
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Équipes & groupes</h1>
          <p className="text-sm text-muted-foreground">
            12 groupes (A–L), 4 équipes par groupe. Code ISO pour les drapeaux
            (flagcdn).
          </p>
        </div>
        <Link
          href="/admin/matches/new"
          className="text-sm text-primary hover:underline"
        >
          ← Créateur de match
        </Link>
      </div>

      <WorldCupWinnerPanel teams={tournamentTeams} config={tournamentConfig} />

      <TournamentTeamsForm groups={groups} teamsByGroup={teamsByGroup} />
    </div>
  );
}
