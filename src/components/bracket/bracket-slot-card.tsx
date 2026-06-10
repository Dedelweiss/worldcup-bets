import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import { BracketSlotTeamPick } from "@/components/bracket/bracket-slot-team-pick";
import { TeamFlag } from "@/components/shared/team-flag";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { canPlaceBetOnMatch } from "@/lib/bets/can-place-bet-on-match";
import { formatKickoff } from "@/lib/format";
import { goldenMatchCardClass } from "@/lib/golden-match";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { TBD_PLACEHOLDER_TEAM, tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { BracketSlotWithMatch } from "@/types/database";

interface BracketSlotCardProps {
  slot: BracketSlotWithMatch;
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

  if (!m) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border/70 bg-muted/15",
          compact ? "min-h-[72px] px-2.5 py-2" : "p-4",
          highlight && "border-primary/40",
        )}
      >
        <p className="truncate text-[10px] font-medium text-muted-foreground">
          {slot.label}
        </p>
        {kickoffAt ? (
          <p className="mt-1.5 text-[10px] font-medium tabular-nums text-primary">
            {formatKickoff(kickoffAt)}
          </p>
        ) : null}
        <div className="mt-2 space-y-1">
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
          "rounded-lg border bg-card transition-all",
          compact ? "min-w-[148px] px-2.5 py-2" : "p-3",
          highlight
            ? "border-primary/50 ring-1 ring-primary/30"
            : "border-border/80",
          goldenMatchCardClass(m.is_golden ?? false, m.status === "live"),
        )}
      >
        <p className="truncate text-[10px] font-medium text-muted-foreground">
          {slot.label}
        </p>
        {kickoffAt && (
          <p
            className={cn(
              "mb-1.5 font-medium tabular-nums text-primary",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {formatKickoff(kickoffAt)}
          </p>
        )}
        {(m.is_golden ?? false) && (
          <div className="mb-1.5 flex justify-center">
            <GoldenMatchBadge compact className="h-4 px-1.5 text-[9px]" />
          </div>
        )}

        <BracketSlotTeamPick
          match={m}
          betStatus={betStatus}
          compact={compact}
        />

        {showPickHint && m.status === "scheduled" && (
          <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
            Cliquez une équipe pour parier
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-1 border-t border-border/50 pt-1.5">
          <Badge
            variant={m.status === "live" ? "default" : "secondary"}
            className="h-4 px-1 text-[9px]"
          >
            {m.status === "live"
              ? "Live"
              : m.status === "finished"
                ? "Fin"
                : "—"}
          </Badge>
          <Link
            href={`/matches/${m.id}#mon-pronostic`}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
          >
            Détail
            <ArrowRight className="size-3" aria-hidden />
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
        "flex items-center gap-1.5",
        muted && "text-muted-foreground/80",
      )}
    >
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={compact ? 18 : 20}
      />
      <span className={cn("truncate", compact ? "text-[11px]" : "text-xs")}>
        {tbdTeamDisplayName(team)}
      </span>
    </div>
  );
}
