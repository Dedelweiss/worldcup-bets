import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { KnockoutRegulationNote } from "@/components/matches/knockout-regulation-note";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { LiveMatchClock } from "@/components/matches/live-match-clock";
import { MatchKickoffMeta } from "@/components/matches/match-kickoff-meta";
import { cn } from "@/lib/utils";
import { goldenMatchHeaderClass } from "@/lib/golden-match";
import { isKnockoutStage } from "@/lib/tournament/constants";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

interface MatchHeaderProps {
  match: MatchWithTeams;
  adminEditHref?: string;
}

/** Fil d'Ariane + métadonnées match (le score est dans MatchScoreboard). */
export function MatchHeader({ match, adminEditHref }: MatchHeaderProps) {
  const isLive = match.status === "live";
  const isGolden = match.is_golden ?? false;

  return (
    <div className={cn("space-y-3 md:space-y-4", goldenMatchHeaderClass(isGolden))}>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
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

      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight md:text-2xl lg:text-3xl">
          {tbdTeamDisplayName(match.home_team)}{" "}
          <span className="font-normal text-muted-foreground">vs</span>{" "}
          {tbdTeamDisplayName(match.away_team)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isGolden && <GoldenMatchBadge compact />}
          {isLive ? (
            <LiveMatchClock
              kickoffAt={match.kickoff_at}
              minute={match.live_minute}
              injuryTime={match.live_injury_time}
              clockAnchorAt={match.live_clock_anchor_at}
              clockManual={match.live_clock_manual}
              size="sm"
            />
          ) : (
            <Badge variant="secondary">{STATUS_LABEL[match.status]}</Badge>
          )}
          {match.round && (
            <span className="text-sm text-muted-foreground">{match.round}</span>
          )}
          {isGolden && (
            <span className="hidden text-sm font-medium text-amber-700 md:inline dark:text-amber-300">
              · Gains doublés
            </span>
          )}
        </div>
      </div>

      {isGolden && (
        <p className="text-sm font-medium text-amber-700 md:hidden dark:text-amber-300">
          Match en or — gains doublés sur cette affiche.
        </p>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
        <MatchKickoffMeta
          kickoffAt={match.kickoff_at}
          align="start"
          className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 sm:inline-flex"
        />
        {match.venue ? (
          <p className="text-xs text-muted-foreground md:text-sm">{match.venue}</p>
        ) : null}
      </div>

      {isKnockoutStage(match.stage) && <KnockoutRegulationNote />}
    </div>
  );
}
