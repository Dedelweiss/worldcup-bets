"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { placeBetAction } from "@/app/(app)/matches/actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { TeamNavLink } from "@/components/shared/team-nav-link";
import { canPlaceBetOnMatch } from "@/lib/bets/can-place-bet-on-match";
import { formatOdd } from "@/lib/format";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { isTbdTeam, tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type { MatchResultSelection, MatchWithTeams, Team } from "@/types/database";

interface BracketSlotTeamPickProps {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
  compact?: boolean;
}

export function BracketSlotTeamPick({
  match,
  betStatus,
  compact = false,
}: BracketSlotTeamPickProps) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<MatchResultSelection | null>(
    null,
  );
  const [selected, setSelected] = useState<MatchResultSelection | null>(
    betStatus?.matchResultSelection ?? null,
  );

  useEffect(() => {
    setSelected(betStatus?.matchResultSelection ?? null);
  }, [betStatus?.matchResultSelection]);

  const { allowed: bettingOpen } = canPlaceBetOnMatch(match);
  const homeKnown = !isTbdTeam(match.home_team);
  const awayKnown = !isTbdTeam(match.away_team);
  const hasExactScore = betStatus?.hasExactScore ?? false;
  const canPick =
    bettingOpen &&
    !hasExactScore &&
    homeKnown &&
    awayKnown &&
    match.odd_home &&
    match.odd_away;

  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;

  async function handlePick(key: MatchResultSelection) {
    if (!canPick || loadingKey) return;

    if (selected === key && betStatus?.hasMatchResult) {
      toast.message("Ce pronostic est déjà enregistré.");
      return;
    }

    setLoadingKey(key);
    const result = await placeBetAction(match.id, key);
    setLoadingKey(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setSelected(key);
    const label =
      key === "home"
        ? tbdTeamDisplayName(match.home_team)
        : key === "away"
          ? tbdTeamDisplayName(match.away_team)
          : "Nul";
    toast.success(
      betStatus?.hasMatchResult
        ? `Pronostic mis à jour : ${label}`
        : `Vainqueur choisi : ${label}`,
    );
    router.refresh();
  }

  if (finished) {
    return (
      <div className="space-y-1.5">
        <TeamLine
          team={match.home_team}
          score={match.home_score}
          highlight={(match.home_score ?? 0) > (match.away_score ?? 0)}
          compact={compact}
        />
        <div
          className="flex items-center justify-center py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
          aria-hidden
        >
          vs
        </div>
        <TeamLine
          team={match.away_team}
          score={match.away_score}
          highlight={(match.away_score ?? 0) > (match.home_score ?? 0)}
          compact={compact}
        />
      </div>
    );
  }

  if (!canPick) {
    return (
      <div className="space-y-1.5">
        <TeamLine team={match.home_team} compact={compact} muted={!homeKnown} />
        <TeamLine team={match.away_team} compact={compact} muted={!awayKnown} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <PickableTeamRow
        team={match.home_team}
        odd={match.odd_home!}
        selected={selected === "home"}
        loading={loadingKey === "home"}
        disabled={loadingKey != null}
        compact={compact}
        onPick={() => void handlePick("home")}
      />
      <PickableTeamRow
        team={match.away_team}
        odd={match.odd_away!}
        selected={selected === "away"}
        loading={loadingKey === "away"}
        disabled={loadingKey != null}
        compact={compact}
        onPick={() => void handlePick("away")}
      />
      {match.odd_draw && (
        <button
          type="button"
          disabled={loadingKey != null}
          onClick={() => void handlePick("draw")}
          className={cn(
            "flex w-full cursor-pointer items-center justify-center gap-1 rounded-[var(--radius-control)] border px-2.5 py-1.5 text-xs font-medium transition-colors",
            selected === "draw"
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-[var(--color-line)] bg-black/20 text-muted-foreground hover:border-primary/35 hover:text-foreground",
            loadingKey != null && loadingKey !== "draw" && "opacity-60",
          )}
        >
          {loadingKey === "draw" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : selected === "draw" ? (
            <Check className="size-3 text-lime-400" aria-hidden />
          ) : null}
          Nul {formatOdd(match.odd_draw)}
        </button>
      )}
    </div>
  );
}

function PickableTeamRow({
  team,
  odd,
  selected,
  loading,
  disabled,
  compact,
  onPick,
}: {
  team: Team;
  odd: number;
  selected: boolean;
  loading: boolean;
  disabled: boolean;
  compact?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-control)] border px-2.5 py-2 transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary/50 bg-primary/12 ring-1 ring-primary/25"
          : "border-[var(--color-line)] bg-black/20 hover:border-primary/35 hover:bg-primary/[0.06]",
        disabled && !loading && "opacity-60",
      )}
      title={`Choisir ${tbdTeamDisplayName(team)}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <TeamFlag
          name={team.name}
          code={team.code}
          logoUrl={team.logo_url}
          teamId={team.id}
          size={compact ? 18 : 20}
        />
        <span className={cn("truncate text-left font-medium", compact ? "text-xs" : "text-sm")}>
          {tbdTeamDisplayName(team)}
        </span>
        {selected && !loading && (
          <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
        )}
      </span>
      <span className="shrink-0 tabular-nums text-xs font-semibold text-primary">
        {loading ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          formatOdd(odd)
        )}
      </span>
    </button>
  );
}

function TeamLine({
  team,
  score,
  highlight,
  compact,
  muted,
  linkable = true,
}: {
  team: Pick<Team, "id" | "name" | "code" | "logo_url">;
  score?: number | null;
  highlight?: boolean;
  compact?: boolean;
  muted?: boolean;
  linkable?: boolean;
}) {
  const shellClass = cn(
    "flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-2.5 py-2 transition-colors",
    highlight
      ? "border border-primary/25 bg-primary/[0.08] font-semibold text-foreground shadow-[inset_3px_0_0_0] shadow-primary"
      : "border border-transparent bg-black/15",
    !highlight && muted && "text-muted-foreground/75",
    !highlight && !muted && "hover:bg-black/25",
  );

  const inner = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamFlag
          name={team.name}
          code={team.code}
          logoUrl={team.logo_url}
          teamId={team.id}
          size={compact ? 20 : 24}
        />
        <span className={cn("truncate", compact ? "text-xs" : "text-sm")}>
          {tbdTeamDisplayName(team)}
        </span>
      </div>
      {score != null && (
        <span
          className={cn(
            "shrink-0 tabular-nums font-heading font-bold",
            compact ? "text-sm" : "text-base",
            highlight ? "text-primary" : "text-foreground",
          )}
        >
          {score}
        </span>
      )}
    </>
  );

  if (!linkable) {
    return <div className={shellClass}>{inner}</div>;
  }

  return (
    <TeamNavLink team={team} className={shellClass}>
      {inner}
    </TeamNavLink>
  );
}
