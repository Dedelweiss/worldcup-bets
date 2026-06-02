import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import {
  MATCH_RESULT_COPY,
  MATCH_RESULT_OUTCOME,
} from "@/lib/bets/match-result-copy";
import { formatKickoff, formatKickoffRelative, formatOdd } from "@/lib/format";
import { MatchCardStatusBadges } from "@/components/dashboard/match-card-status-badges";
import { goldenMatchCardClass } from "@/lib/golden-match";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { MatchWithTeams, Team } from "@/types/database";

interface MatchCardProps {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
}

function TeamRow({ team }: { team: Team }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={28}
      />
      <span className="truncate text-sm font-medium">
        {tbdTeamDisplayName(team)}
      </span>
    </div>
  );
}

export function MatchCard({ match, betStatus }: MatchCardProps) {
  const isLive = match.status === "live";
  const isGolden = match.is_golden ?? false;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const hasClassicBet = betStatus?.hasClassicBet ?? false;
  const hasFunToPlay =
    hasClassicBet && (betStatus?.pendingFunToPlay ?? 0) > 0;

  const ctaLabel = isLive
    ? hasFunToPlay
      ? "Match en direct · paris fun"
      : hasClassicBet
        ? "Voir mon pronostic"
        : "Voir le match en direct"
    : hasFunToPlay
      ? "Paris fun à jouer"
      : hasClassicBet
        ? "Voir mon pronostic"
        : "Parier sur ce match";

  const ctaHref =
    hasFunToPlay && hasClassicBet
      ? `/matches/${match.id}#paris-fun`
      : `/matches/${match.id}`;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        goldenMatchCardClass(isGolden, isLive),
        hasClassicBet && !isGolden && "ring-1 ring-primary/40",
        hasFunToPlay && "ring-1 ring-amber-500/40",
      )}
    >
      <CardContent className="p-0">
        <div
          className={cn(
            "flex items-center justify-between border-b border-border/60 px-4 py-2",
            isLive ? "bg-primary/15" : "bg-muted/30",
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {isGolden && <GoldenMatchBadge compact />}
            <MatchCardStatusBadges matchId={match.id} status={betStatus} />
            <Badge
              variant={isLive ? "default" : "secondary"}
              className={cn(isLive && !isGolden && "animate-pulse")}
            >
              {isLive ? "EN DIRECT" : match.round ?? "Coupe du Monde"}
            </Badge>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatKickoff(match.kickoff_at)}
            <span className="hidden sm:inline">
              · {formatKickoffRelative(match.kickoff_at)}
            </span>
          </span>
        </div>

        <div className="space-y-3 px-4 py-4">
          {isLive && !hasScore ? (
            <LiveMatchAnimation
              homeTeam={match.home_team}
              awayTeam={match.away_team}
            />
          ) : hasScore ? (
            <MatchScoreInline
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homeScore={match.home_score}
              awayScore={match.away_score}
              isLive={isLive}
              size="sm"
            />
          ) : (
            <div className="flex items-center gap-3">
              <TeamRow team={match.home_team} />
              <span className="text-xs font-semibold text-muted-foreground">vs</span>
              <TeamRow team={match.away_team} />
            </div>
          )}

          {!hasScore && !isLive && match.odd_home && match.odd_draw && match.odd_away && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: MATCH_RESULT_OUTCOME.home, odd: match.odd_home },
                { label: MATCH_RESULT_OUTCOME.draw, odd: match.odd_draw },
                { label: MATCH_RESULT_OUTCOME.away, odd: match.odd_away },
              ].map((outcome) => (
                <div
                  key={outcome.label}
                  className="flex flex-col items-center rounded-lg border border-border bg-muted/20 py-2"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {outcome.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {formatOdd(outcome.odd)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isLive && (
            <p className="text-center text-xs text-primary">
              {MATCH_RESULT_COPY.betsClosedLive}
            </p>
          )}
        </div>

        <div className="border-t border-border/60 px-4 py-3">
          <Link
            href={ctaHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "w-full",
              hasFunToPlay && "bg-amber-600 text-white hover:bg-amber-600/90",
            )}
          >
            {ctaLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
