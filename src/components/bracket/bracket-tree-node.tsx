import Link from "next/link";
import { Radio } from "lucide-react";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { getKnockoutMatchDisplay } from "@/lib/tournament/knockout-match-display";
import type { BracketSlotDisplay } from "@/lib/tournament/bracket-projection";
import type {
  ProjectedTeam,
  ProjectedTeamCandidate,
} from "@/lib/tournament/bracket-projection";
import { isTbdTeam, TBD_PLACEHOLDER_TEAM } from "@/lib/tournament/tbd-team";

interface BracketTreeNodeProps {
  slot: BracketSlotDisplay;
  highlight?: boolean;
}

export function BracketTreeNode({ slot, highlight }: BracketTreeNodeProps) {
  const m = slot.match;
  const matchId = m?.id ?? slot.match_id;
  const display =
    matchId != null ? getKnockoutMatchDisplay(matchId) : null;
  const isLive = m?.status === "live";
  const isFinal = slot.stage === "final";
  const accent = highlight || isFinal;

  const inner = (
    <div
      className={cn(
        "group/node relative min-w-[128px] max-w-[148px] rounded-[var(--radius-control)] border bg-[var(--color-surface)] px-2 py-1.5 shadow-sm transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)]",
        accent
          ? "border-amber-500/40 ring-1 ring-amber-500/25 hover:border-amber-500/55"
          : "border-[var(--color-line)] hover:border-primary/35 hover:shadow-[0_0_16px_-6px] hover:shadow-primary/20",
        isLive && "border-fuchsia-500/40 ring-1 ring-fuchsia-500/25",
        m && "hover:-translate-y-px",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[10px] font-bold text-muted-foreground">
          {display?.title ?? slot.label}
        </span>
        {isLive && (
          <Radio
            className="size-2.5 shrink-0 animate-pulse text-fuchsia-400"
            aria-label="En direct"
          />
        )}
      </div>

      {display && (
        <div className="mt-0.5 space-y-px font-mono text-[8px] font-semibold leading-tight tracking-wide text-foreground/75">
          <p className="truncate">{display.home}</p>
          <p className="truncate">{display.away}</p>
        </div>
      )}

      <div className="mt-1.5 space-y-0.5">
        <TreeSide slot={slot} side="home" />
        <TreeSide slot={slot} side="away" />
      </div>
    </div>
  );

  if (!m) return inner;

  return (
    <Link
      href={`/matches/${m.id}`}
      className="block outline-none focus-visible:rounded-[var(--radius-control)] focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {inner}
    </Link>
  );
}

function TreeSide({
  slot,
  side,
}: {
  slot: BracketSlotDisplay;
  side: "home" | "away";
}) {
  const m = slot.match;
  const projection = slot.projection;

  if (!m) {
    return <TreeTeamRow team={null} />;
  }

  const matchTeam = side === "home" ? m.home_team : m.away_team;
  const candidates =
    side === "home"
      ? projection?.homeCandidates
      : projection?.awayCandidates;
  const projected =
    side === "home" ? projection?.home : projection?.away;

  if (!isTbdTeam(matchTeam)) {
    return (
      <TreeTeamRow
        team={{
          id: matchTeam.id,
          name: matchTeam.name,
          code: matchTeam.code,
          logo_url: matchTeam.logo_url,
        }}
        score={side === "home" ? m.home_score : m.away_score}
        winner={
          m.status === "finished" &&
          m.home_score != null &&
          m.away_score != null &&
          ((side === "home" && m.home_score > m.away_score) ||
            (side === "away" && m.away_score > m.home_score))
        }
      />
    );
  }

  if (candidates?.length) {
    return <TreeCandidatePool candidates={candidates} />;
  }

  if (projected) {
    return <TreeTeamRow team={projected} projected />;
  }

  return <TreeTeamRow team={null} />;
}

function TreeCandidatePool({
  candidates,
}: {
  candidates: ProjectedTeamCandidate[];
}) {
  const visible = candidates.slice(0, 4);
  const rest = candidates.length - visible.length;

  return (
    <div className="flex flex-wrap gap-0.5 rounded border border-dashed border-sky-500/30 bg-sky-500/[0.06] px-1 py-0.5">
      {visible.map((c) => (
        <span
          key={`${c.ref}-${c.id}`}
          className="inline-flex items-center gap-0.5 rounded bg-black/20 px-0.5"
          title={`${c.ref} · ${c.name}`}
        >
          <TeamFlag
            name={c.name}
            code={c.code}
            logoUrl={c.logo_url}
            teamId={c.id}
            size={12}
          />
          <span className="font-mono text-[7px] font-bold text-sky-300/90">
            {c.ref}
          </span>
        </span>
      ))}
      {rest > 0 && (
        <span className="self-center px-0.5 text-[7px] font-medium text-muted-foreground">
          +{rest}
        </span>
      )}
    </div>
  );
}

function TreeTeamRow({
  team,
  projected,
  score,
  winner,
}: {
  team: ProjectedTeam | null;
  projected?: boolean;
  score?: number | null;
  winner?: boolean;
}) {
  const resolved = team ?? TBD_PLACEHOLDER_TEAM;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded px-1 py-0.5",
        projected && "border border-dashed border-sky-500/25 bg-sky-500/[0.05]",
        winner && "bg-emerald-500/10 ring-1 ring-emerald-500/25",
        !team && "bg-black/15 opacity-70",
      )}
    >
      <TeamFlag
        name={resolved.name}
        code={resolved.code}
        logoUrl={resolved.logo_url}
        teamId={resolved.id}
        size={14}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[9px] font-medium",
          projected && "text-sky-100",
          winner && "font-semibold text-emerald-100",
        )}
      >
        {team ? (team.code ?? team.name.slice(0, 3).toUpperCase()) : "TBD"}
      </span>
      {score != null && (
        <span className="shrink-0 font-mono text-[9px] font-bold tabular-nums">
          {score}
        </span>
      )}
    </div>
  );
}
