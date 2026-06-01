import { MatchCard } from "@/components/dashboard/match-card";
import { MotionReveal } from "@/components/ui/motion-reveal";
import {
  sortMatchesByUserPriority,
  type UserMatchBetStatus,
} from "@/lib/bets/user-match-status";
import type { MatchWithTeams } from "@/types/database";

interface UpcomingMatchesProps {
  matches: MatchWithTeams[];
  betStatuses?: Record<number, UserMatchBetStatus>;
}

export function UpcomingMatches({
  matches,
  betStatuses = {},
}: UpcomingMatchesProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
        Aucun match à venir pour le moment. Les fixtures seront synchronisées depuis
        API-Football.
      </div>
    );
  }

  const sorted = sortMatchesByUserPriority(matches, betStatuses);
  const withFun = sorted.filter((m) => (betStatuses[m.id]?.pendingFunToPlay ?? 0) > 0);
  const withBet = sorted.filter((m) => betStatuses[m.id]?.hasClassicBet);

  return (
    <div className="space-y-4">
      {withFun.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {withFun.length} match{withFun.length > 1 ? "s" : ""} avec un pari fun à
          jouer sur votre pronostic.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map((match, index) => (
          <MotionReveal key={match.id} index={index}>
            <MatchCard
              match={match}
              betStatus={betStatuses[match.id]}
            />
          </MotionReveal>
        ))}
      </div>
      {withBet.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {withBet.length} match{withBet.length > 1 ? "s" : ""} avec pronostic
          classique enregistré
        </p>
      )}
    </div>
  );
}
