import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { TeamFlag } from "@/components/shared/team-flag";
import { TeamNavLink } from "@/components/shared/team-nav-link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { LiveMatchClock } from "@/components/matches/live-match-clock";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { MatchOddsSourceBadge } from "@/components/matches/match-odds-source-badge";
import { MATCH_RESULT_COPY } from "@/lib/bets/match-result-copy";
import { MatchCardQuickBet } from "@/components/dashboard/match-card-quick-bet";
import { MatchTimingBanner } from "@/components/matches/match-timing-banner";
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
    <TeamNavLink team={team} className="flex flex-1 flex-col items-center gap-2">
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={40}
        className="shadow-md ring-1 ring-white/10"
      />
      <span className="max-w-[5.5rem] truncate text-center text-xs font-medium">
        {tbdTeamDisplayName(team)}
      </span>
    </TeamNavLink>
  );
}

export function MatchCard({ match, betStatus }: MatchCardProps) {
  const isLive = match.status === "live";
  const isUpcoming = match.status === "scheduled";
  const isGolden = match.is_golden ?? false;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const hasClassicBet = betStatus?.hasClassicBet ?? false;
  const hasFunToPlay =
    hasClassicBet && (betStatus?.pendingFunToPlay ?? 0) > 0;
  const { allowed: bettingOpen } = canPlaceBetOnMatch(match);
  const showQuickPick =
    !hasScore && !isLive && bettingOpen;

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
      interactive
      className={cn(
        "group overflow-hidden",
        goldenMatchCardClass(isGolden, isLive),
        isUpcoming && "hover:border-sky-500/30",
        hasClassicBet && !isGolden && !isLive && "ring-1 ring-primary/30",
        hasFunToPlay && "ring-1 ring-amber-500/40",
      )}
    >
      <CardContent className="p-0">
        <MatchTimingBanner
          isLive={isLive}
          kickoffAt={match.kickoff_at}
          round={match.round}
        />

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 px-4 py-2">
          {isGolden && <GoldenMatchBadge compact />}
          <MatchCardStatusBadges matchId={match.id} status={betStatus} />
        </div>

        <div
          className={cn(
            "space-y-4 px-4 py-5",
            isLive && "bg-gradient-to-b from-red-500/[0.04] to-transparent",
          )}
        >
          {isLive && (
            <div className="flex justify-center">
              <LiveMatchClock
                kickoffAt={match.kickoff_at}
                minute={match.live_minute}
                injuryTime={match.live_injury_time}
                clockAnchorAt={match.live_clock_anchor_at}
                clockManual={match.live_clock_manual}
                size="md"
              />
            </div>
          )}

          {isLive ? (
            hasScore ? (
              <MatchScoreInline
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeScore={match.home_score}
                awayScore={match.away_score}
                size="sm"
              />
            ) : (
              <LiveMatchAnimation
                homeTeam={match.home_team}
                awayTeam={match.away_team}
              />
            )
          ) : hasScore ? (
            <MatchScoreInline
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homeScore={match.home_score}
              awayScore={match.away_score}
              size="sm"
            />
          ) : (
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <TeamRow team={match.home_team} />
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                vs
              </span>
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
                    <MatchCardQuickBet
                      match={match}
                      betStatus={betStatus}
                      bettingOpen={bettingOpen}
                    />
                  </>
                )}
            </div>
          )}

          {isLive && (
            <p className="text-center text-xs font-medium text-red-400/80">
              {MATCH_RESULT_COPY.betsClosedLive}
            </p>
          )}
        </div>

        <div className="border-t border-border/60 px-4 py-3">
          <Link
            href={ctaHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "w-full transition-all",
              isLive && "bg-red-600 text-white hover:bg-red-500",
              hasFunToPlay && !isLive && "bg-amber-600 text-white hover:bg-amber-600/90",
            )}
          >
            {ctaLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
