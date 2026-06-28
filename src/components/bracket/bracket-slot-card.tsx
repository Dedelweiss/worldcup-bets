import Link from "next/link";
import { ArrowRight, Pencil, Radio } from "lucide-react";
import { BracketSlotTeamPick } from "@/components/bracket/bracket-slot-team-pick";
import { TeamFlag } from "@/components/shared/team-flag";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { canPlaceBetOnMatch } from "@/lib/bets/can-place-bet-on-match";
import { formatKickoff, formatKnockoutKickoff } from "@/lib/format";
import { getKnockoutMatchDisplay } from "@/lib/tournament/knockout-match-display";
import { goldenMatchCardClass } from "@/lib/golden-match";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { BracketSlotDisplay } from "@/lib/tournament/bracket-projection";
import { TBD_PLACEHOLDER_TEAM, tbdTeamDisplayName } from "@/lib/tournament/tbd-team";

interface BracketSlotCardProps {
  slot: BracketSlotDisplay;
  betStatus?: UserMatchBetStatus;
  compact?: boolean;
  isAdmin?: boolean;
  highlight?: boolean;
}

export function BracketSlotCard({
  slot,
  betStatus,
  compact = false,
  isAdmin = false,
  highlight = false,
}: BracketSlotCardProps) {
  const m = slot.match;
  const kickoffAt = m?.kickoff_at ?? slot.scheduled_kickoff ?? null;
  const matchId = m?.id ?? slot.match_id;
  const knockoutDisplay =
    matchId != null ? getKnockoutMatchDisplay(matchId) : null;
  const kickoffLabel =
    kickoffAt != null
      ? knockoutDisplay
        ? formatKnockoutKickoff(kickoffAt)
        : formatKickoff(kickoffAt)
      : null;
  const isFinal = slot.stage === "final";
  const isLive = m?.status === "live";
  const isFinished = m?.status === "finished";
  const cardHighlight = highlight || isFinal;

  if (!m) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-raised)]/50",
          compact ? "min-h-[80px] px-3 py-2.5" : "p-4",
          cardHighlight && "border-amber-500/30",
        )}
      >
        <p className="truncate text-xs font-medium text-muted-foreground">
          {knockoutDisplay?.title ?? slot.label}
        </p>
        {kickoffLabel ? (
          <p className="mt-1.5 text-xs font-medium tabular-nums text-primary">
            {kickoffLabel}
          </p>
        ) : null}
        {knockoutDisplay && (
          <div className="mt-2 space-y-0.5 font-mono text-xs font-semibold tracking-wide text-foreground/90">
            <p>{knockoutDisplay.home}</p>
            <p>{knockoutDisplay.away}</p>
          </div>
        )}
        <div className="mt-3 space-y-2">
          <StaticTeamLine team={TBD_PLACEHOLDER_TEAM} compact={compact} muted />
          <StaticTeamLine team={TBD_PLACEHOLDER_TEAM} compact={compact} muted />
        </div>
      </div>
    );
  }

  const { allowed: bettingOpen } = canPlaceBetOnMatch(m);
  const showPickHint = bettingOpen && !betStatus?.hasExactScore;

  return (
    <div className="group relative">
      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-card)] border bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-[var(--dur-base)]",
          compact ? "min-w-[156px] px-3 py-2.5" : "p-4",
          cardHighlight
            ? "border-amber-500/35 ring-1 ring-amber-500/20"
            : "border-[var(--color-line)]",
          isLive && "border-fuchsia-500/35 ring-1 ring-fuchsia-500/20",
          goldenMatchCardClass(m.is_golden ?? false, isLive),
        )}
      >
        {isLive && (
          <div className="mb-2 flex items-center gap-1.5 border-b border-fuchsia-500/15 pb-2 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-300">
            <Radio className="size-3 animate-pulse" aria-hidden />
            En direct
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {knockoutDisplay?.title ?? slot.label}
            </p>
            {knockoutDisplay && (
              <div className="mt-1 space-y-0.5 font-mono text-[11px] font-semibold tracking-wide text-foreground/85">
                <p>{knockoutDisplay.home}</p>
                <p>{knockoutDisplay.away}</p>
              </div>
            )}
          </div>
          {kickoffLabel && !isLive && (
            <p
              className={cn(
                "shrink-0 font-medium tabular-nums text-primary",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {kickoffLabel}
            </p>
          )}
        </div>

        {(m.is_golden ?? false) && (
          <div className="mt-2 flex justify-start">
            <GoldenMatchBadge compact className="h-4 px-1.5 text-[9px]" />
          </div>
        )}

        <div className={cn(compact ? "mt-2" : "mt-3")}>
          <BracketSlotTeamPick
            match={m}
            betStatus={betStatus}
            compact={compact}
          />
        </div>

        {showPickHint && m.status === "scheduled" && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Touchez une équipe pour parier
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-line)] pt-2.5">
          <Badge
            variant={isLive ? "default" : "secondary"}
            className={cn(
              "h-5 px-1.5 text-[10px]",
              isLive && "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200",
              isFinished && "bg-white/[0.06] text-muted-foreground",
            )}
          >
            {isLive ? "Live" : isFinished ? "Terminé" : "À venir"}
          </Badge>
          <Link
            href={`/matches/${m.id}#mon-pronostic`}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            Détail
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
      {isAdmin && (
        <Link
          href={`/admin/matches/${m.id}`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "absolute -right-1 -top-1 z-10 h-7 gap-1 px-2 opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus:opacity-100",
          )}
          title="Modifier le match (admin)"
        >
          <Pencil className="size-3" />
          <span className="sr-only sm:not-sr-only sm:text-xs">Edit</span>
        </Link>
      )}
    </div>
  );
}

function StaticTeamLine({
  team,
  compact,
  muted,
}: {
  team: { id: number; name: string; code: string | null; logo_url: string | null };
  compact?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-control)] bg-black/20 px-2 py-1.5",
        muted && "text-muted-foreground/80",
      )}
    >
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={compact ? 20 : 22}
      />
      <span className={cn("truncate font-medium", compact ? "text-xs" : "text-sm")}>
        {tbdTeamDisplayName(team)}
      </span>
    </div>
  );
}
