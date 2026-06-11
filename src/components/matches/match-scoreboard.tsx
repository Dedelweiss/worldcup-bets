import { Card, CardContent } from "@/components/ui/card";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { LiveMatchClock } from "@/components/matches/live-match-clock";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { MatchTimingBanner } from "@/components/matches/match-timing-banner";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

interface MatchScoreboardProps {
  match: MatchWithTeams;
}

export function MatchScoreboard({ match }: MatchScoreboardProps) {
  const isLive = match.status === "live";
  const hasScore = match.home_score !== null && match.away_score !== null;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isLive &&
          "border-red-500/30 shadow-[0_0_32px_-12px] shadow-red-500/25 ring-1 ring-red-500/20",
      )}
    >
      <MatchTimingBanner
        isLive={isLive}
        kickoffAt={match.kickoff_at}
        round={match.round}
      />
      <CardContent className="space-y-5 p-4 sm:p-6">
        {isLive && (
          <div className="flex justify-center">
            <LiveMatchClock
              kickoffAt={match.kickoff_at}
              minute={match.live_minute}
              injuryTime={match.live_injury_time}
              clockAnchorAt={match.live_clock_anchor_at}
              clockManual={match.live_clock_manual}
              size="lg"
            />
          </div>
        )}

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
            size="lg"
          />
        )}
      </CardContent>
    </Card>
  );
}
