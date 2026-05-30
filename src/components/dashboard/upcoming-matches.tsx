import { MatchCard } from "@/components/dashboard/match-card";
import type { MatchWithTeams } from "@/types/database";

interface UpcomingMatchesProps {
  matches: MatchWithTeams[];
}

export function UpcomingMatches({ matches }: UpcomingMatchesProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
        Aucun match à venir pour le moment. Les fixtures seront synchronisées depuis
        API-Football.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
