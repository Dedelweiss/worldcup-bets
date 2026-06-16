import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { LiveMatchClock } from "@/components/matches/live-match-clock";
import { MatchHeroBetCta } from "@/components/matches/match-hero-bet-cta";
import { MatchKickoffCountdown } from "@/components/matches/match-kickoff-countdown";
import { MatchKickoffMeta } from "@/components/matches/match-kickoff-meta";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
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
  /** Affiche le CTA « Placer mon pronostic » (pré-match, pas encore parié). */
  showBetCta?: boolean;
  /** Affiche le compte à rebours avant coup d'envoi. */
  showCountdown?: boolean;
}

/** Bandeau match — score centré, style broadcast, sans halos colorés. */
export function MatchPageHero({
  match,
  adminEditHref,
  showBetCta = false,
  showCountdown = false,
}: MatchPageHeroProps) {
  const isLive = match.status === "live";
  const isGolden = match.is_golden ?? false;
  const hasScore = match.home_score !== null && match.away_score !== null;

  return (
    <header
      id="score"
      className={cn(
        "scroll-mt-28 overflow-x-clip rounded-2xl border border-white/[0.08] bg-zinc-900/40 md:scroll-mt-32",
        isLive && "border-red-500/25 ring-1 ring-red-500/15",
        goldenMatchHeaderClass(isGolden),
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5 md:px-5">
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

      <div className="space-y-5 px-4 py-5 md:space-y-6 md:px-6 md:py-6">
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

        <div className="relative mx-auto flex w-full justify-center">
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

        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          {showCountdown && (
            <MatchKickoffCountdown kickoffAt={match.kickoff_at} />
          )}

          {showBetCta && <MatchHeroBetCta />}

          <MatchKickoffMeta
            kickoffAt={match.kickoff_at}
            align="center"
            className="text-muted-foreground"
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
