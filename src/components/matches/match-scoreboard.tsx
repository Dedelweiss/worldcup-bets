import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { cn } from "@/lib/utils";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

interface MatchScoreboardProps {
  match: MatchWithTeams;
}

export function MatchScoreboard({ match }: MatchScoreboardProps) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore = match.home_score !== null && match.away_score !== null;

  const scoreLabel = isFinished
    ? "Score final"
    : isLive
      ? "Score en cours"
      : hasScore
        ? "Score provisoire"
        : null;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isLive && "border-primary/50 ring-1 ring-primary/30",
      )}
    >
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {scoreLabel && (
            <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
              {scoreLabel}
            </Badge>
          )}
          {isLive && !hasScore && (
            <Badge variant="default" className="animate-pulse text-xs">
              En direct
            </Badge>
          )}
          {!isLive && !isFinished && (
            <Badge variant="secondary" className="text-xs">
              {STATUS_LABEL[match.status]}
            </Badge>
          )}
        </div>

        {isLive && !hasScore ? (
          <LiveMatchAnimation
            homeTeam={match.home_team}
            awayTeam={match.away_team}
          />
        ) : (
          <MatchScoreInline
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            homeScore={match.home_score}
            awayScore={match.away_score}
            isLive={isLive}
            size="lg"
          />
        )}

        {isLive && hasScore && (
          <p className="text-center text-sm font-medium text-primary">
            Match en cours — le score est mis à jour par l&apos;admin
          </p>
        )}
      </CardContent>
    </Card>
  );
}
