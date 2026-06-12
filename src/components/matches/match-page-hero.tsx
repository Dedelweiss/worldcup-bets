import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { LiveMatchClock } from "@/components/matches/live-match-clock";
import { MatchKickoffMeta } from "@/components/matches/match-kickoff-meta";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { getTeamColors } from "@/lib/team-colors";
import { cn } from "@/lib/utils";
import { goldenMatchHeaderClass } from "@/lib/golden-match";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

interface MatchPageHeroProps {
  match: MatchWithTeams;
  adminEditHref?: string;
}

/** Bandeau match unifié — score centré, métadonnées aérées, une seule carte. */
export function MatchPageHero({ match, adminEditHref }: MatchPageHeroProps) {
  const isLive = match.status === "live";
  const isGolden = match.is_golden ?? false;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const homeGlow = getTeamColors(match.home_team.code).from;
  const awayGlow = getTeamColors(match.away_team.code).from;

  return (
    <header
      id="score"
      className={cn(
        "scroll-mt-20 overflow-x-clip rounded-2xl border border-border/50 bg-gradient-to-b from-card via-card to-card/90 shadow-sm md:scroll-mt-24",
        isLive && "border-red-500/25 shadow-[0_0_40px_-16px] shadow-red-500/20 ring-1 ring-red-500/15",
        goldenMatchHeaderClass(isGolden),
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 md:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" />
          Retour
        </Link>
        {adminEditHref && (
          <Link
            href={adminEditHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 border-primary/40 text-primary hover:bg-primary/10",
            )}
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">Modifier</span>
          </Link>
        )}
      </div>

      <div className="space-y-6 px-4 py-6 md:space-y-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isGolden && <GoldenMatchBadge compact />}
          {!isLive && (
            <Badge variant="secondary">{STATUS_LABEL[match.status]}</Badge>
          )}
          {match.round && (
            <span className="text-sm text-muted-foreground">{match.round}</span>
          )}
          {isGolden && (
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Gains doublés
            </span>
          )}
        </div>

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

        <h1 className="sr-only">
          {match.home_team.name} contre {match.away_team.name}
        </h1>

        <div className="relative mx-auto w-full max-w-4xl">
          <div
            className="pointer-events-none absolute inset-y-0 left-[6%] w-36 rounded-full opacity-25 blur-3xl md:left-[10%] md:w-48"
            style={{ background: homeGlow }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-[6%] w-36 rounded-full opacity-25 blur-3xl md:right-[10%] md:w-48"
            style={{ background: awayGlow }}
            aria-hidden
          />

          <div className="relative flex w-full flex-col items-center gap-5">
            {isLive && !hasScore ? (
              <LiveMatchAnimation
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                variant="hero"
                className="w-full"
              />
            ) : (
              <MatchScoreInline
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeScore={match.home_score}
                awayScore={match.away_score}
                variant="hero"
                className="w-full"
              />
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <MatchKickoffMeta
            kickoffAt={match.kickoff_at}
            align="center"
            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          />
          {match.venue ? (
            <p className="text-sm text-muted-foreground">{match.venue}</p>
          ) : null}
          {match.bet_scope_note && match.stage && match.stage !== "group" && (
            <p className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-100/90 md:text-center">
              {match.bet_scope_note}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
