import Link from "next/link";
import { MatchCreatorHub } from "@/components/admin/match-creator-hub";
import {
  getAllTournamentTeams,
  getOpenBracketSlots,
  getTeamsByTournamentGroup,
  getTournamentGroups,
} from "@/lib/tournament/queries";
import type { MatchStage } from "@/types/database";

export const metadata = { title: "Admin · Créateur de match" };

const KNOCKOUT_STAGES: MatchStage[] = [
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

export default async function AdminNewMatchPage() {
  const groups = await getTournamentGroups();

  const teamsByGroup: Record<number, Awaited<ReturnType<typeof getTeamsByTournamentGroup>>> =
    {};
  await Promise.all(
    groups.map(async (g) => {
      teamsByGroup[g.id] = await getTeamsByTournamentGroup(g.id);
    }),
  );

  const allTeams = await getAllTournamentTeams();

  const openSlotsByStage: Record<string, { id: string; label: string }[]> = {};
  await Promise.all(
    KNOCKOUT_STAGES.map(async (stage) => {
      openSlotsByStage[stage] = await getOpenBracketSlots(stage);
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Créateur de match</h1>
        <Link
          href="/admin/teams"
          className="text-sm text-primary hover:underline"
        >
          Équipes & groupes →
        </Link>
      </div>

      <MatchCreatorHub
        groups={groups}
        teamsByGroup={teamsByGroup}
        allTeams={allTeams}
        openSlotsByStage={openSlotsByStage}
      />
    </div>
  );
}
