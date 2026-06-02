import Link from "next/link";
import { Pencil } from "lucide-react";
import { TeamFlag } from "@/components/shared/team-flag";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { formatKickoff } from "@/lib/format";
import { goldenMatchCardClass } from "@/lib/golden-match";
import { TBD_PLACEHOLDER_TEAM, tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { BracketSlotWithMatch, Team } from "@/types/database";

interface BracketSlotCardProps {
  slot: BracketSlotWithMatch;
  compact?: boolean;
  isAdmin?: boolean;
  highlight?: boolean;
}

export function BracketSlotCard({
  slot,
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
          <TeamLine team={TBD_PLACEHOLDER_TEAM} compact={compact} muted />
          <TeamLine team={TBD_PLACEHOLDER_TEAM} compact={compact} muted />
        </div>
      </div>
    );
  }

  const finished =
    m.status === "finished" &&
    m.home_score !== null &&
    m.away_score !== null;

  return (
    <div className="group relative">
      <Link
        href={`/matches/${m.id}`}
        className={cn(
          "block rounded-lg border bg-card transition-all hover:border-primary/60 hover:shadow-md hover:shadow-primary/5",
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
        <div className="space-y-1">
          <TeamLine
            team={m.home_team}
            score={finished ? m.home_score : null}
            highlight={finished && (m.home_score ?? 0) > (m.away_score ?? 0)}
            compact={compact}
          />
          <TeamLine
            team={m.away_team}
            score={finished ? m.away_score : null}
            highlight={finished && (m.away_score ?? 0) > (m.home_score ?? 0)}
            compact={compact}
          />
        </div>
        {(m.is_golden ?? false) && (
          <div className="mb-1.5 flex justify-center">
            <GoldenMatchBadge compact className="text-[9px] h-4 px-1.5" />
          </div>
        )}
        <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/50 pt-1.5">
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
        </div>
      </Link>
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

function TeamLine({
  team,
  score,
  highlight,
  compact,
  muted,
}: {
  team: Pick<Team, "id" | "name" | "code" | "logo_url">;
  score?: number | null;
  highlight?: boolean;
  compact?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1",
        highlight && "font-semibold text-primary",
        muted && "text-muted-foreground/80",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
      {score != null && (
        <span className="shrink-0 tabular-nums text-[11px] font-bold">{score}</span>
      )}
    </div>
  );
}
