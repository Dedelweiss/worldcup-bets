import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { MatchOddsSourceBadge } from "@/components/matches/match-odds-source-badge";
import {
  MATCH_RESULT_COPY,
} from "@/lib/bets/match-result-copy";
import { MatchCardQuickResultPick } from "@/components/dashboard/match-card-quick-result-pick";
import { MatchKickoffMeta } from "@/components/matches/match-kickoff-meta";
import { MatchCardStatusBadges } from "@/components/dashboard/match-card-status-badges";
import { goldenMatchCardClass } from "@/lib/golden-match";
import { canPlaceBetOnMatch } from "@/lib/bets/can-place-bet-on-match";
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
  const { allowed: bettingOpen } = canPlaceBetOnMatch(match);
  const showQuickPick =
    !hasScore && !isLive && bettingOpen && !hasClassicBet;

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
      : hasClassicBet
        ? `/matches/${match.id}#mon-pronostic`
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
            "flex flex-col gap-2 border-b border-border/60 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between",
            isLive ? "bg-primary/15" : "bg-muted/30",
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {isGolden && <GoldenMatchBadge compact />}
            <MatchCardStatusBadges matchId={match.id} status={betStatus} />
            <Badge
              variant={isLive ? "default" : "secondary"}
              className={cn(isLive && !isGolden && "animate-pulse")}
            >
              {isLive ? "EN DIRECT" : match.round ?? "Coupe du Monde"}
            </Badge>
          </div>
          <MatchKickoffMeta kickoffAt={match.kickoff_at} align="end" />
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

          {!hasScore && !isLive && (
            <div className="space-y-2">
              {showQuickPick &&
                match.odd_home &&
                match.odd_draw &&
                match.odd_away && (
                  <>
                    <MatchOddsSourceBadge match={match} className="text-[10px]" />
                    <MatchCardQuickResultPick
                      match={match}
                      betStatus={betStatus}
                      bettingOpen={bettingOpen}
                    />
                  </>
                )}
              {betStatus?.hasExactScore && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Score exact déjà posé —{" "}
                  <Link
                    href={`/matches/${match.id}#mon-pronostic`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    voir le détail
                  </Link>
                </p>
              )}
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
