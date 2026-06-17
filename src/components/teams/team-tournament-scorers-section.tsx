import { TournamentScorersList } from "@/components/tournament/tournament-scorers-list";
import type { TournamentScorer } from "@/types/database";

interface TeamTournamentScorersSectionProps {
  scorers: TournamentScorer[];
  syncedAt: string | null;
  totalGoals: number;
}

export function TeamTournamentScorersSection({
  scorers,
  syncedAt,
  totalGoals,
}: TeamTournamentScorersSectionProps) {
  return (
    <TournamentScorersList
      scorers={scorers}
      syncedAt={syncedAt}
      title="Buteurs au tournoi"
      subtitle={
        scorers.length > 0
          ? `${scorers.length} buteur${scorers.length > 1 ? "s" : ""} · ${totalGoals} but${totalGoals > 1 ? "s" : ""} marqué${totalGoals > 1 ? "s" : ""}`
          : undefined
      }
      emptyMessage="Les buteurs seront listés ici après synchro (Admin → Équipes ou cron)."
    />
  );
}
