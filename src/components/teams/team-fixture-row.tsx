"use client";

import { useRouter } from "next/navigation";
import { TeamFlag } from "@/components/shared/team-flag";
import { TeamNavLink } from "@/components/shared/team-nav-link";
import { Badge } from "@/components/ui/badge";
import { formatKickoff } from "@/lib/format";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

interface TeamFixtureRowProps {
  match: MatchWithTeams;
  teamId: number;
  live?: boolean;
  finished?: boolean;
}

export function TeamFixtureRow({
  match,
  teamId,
  live,
  finished,
}: TeamFixtureRowProps) {
  const router = useRouter();
  const isHome = match.home_team.id === teamId;
  const opponent = isHome ? match.away_team : match.home_team;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const teamScore = isHome ? match.home_score : match.away_score;
  const oppScore = isHome ? match.away_score : match.home_score;

  let resultTone: "win" | "loss" | "draw" | null = null;
  if (finished && hasScore && teamScore != null && oppScore != null) {
    if (teamScore > oppScore) resultTone = "win";
    else if (teamScore < oppScore) resultTone = "loss";
    else resultTone = "draw";
  }

  function openMatch() {
    router.push(`/matches/${match.id}`);
  }

  return (
    <li>
      <div
        role="link"
        tabIndex={0}
        onClick={openMatch}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openMatch();
          }
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/35 px-3 py-3 transition-colors hover:border-white/10 hover:bg-zinc-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          live && "border-red-500/25 ring-1 ring-red-500/10",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {live && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                Live
              </Badge>
            )}
            {match.round && (
              <span className="text-xs text-muted-foreground">{match.round}</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <TeamNavLink
              team={opponent}
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 items-center gap-2"
            >
              <TeamFlag
                name={opponent.name}
                code={opponent.code}
                logoUrl={opponent.logo_url}
                teamId={opponent.id}
                size={24}
              />
              <span className="text-sm font-medium [overflow-wrap:anywhere]">
                vs {tbdTeamDisplayName(opponent)}
              </span>
            </TeamNavLink>
          </div>
          <p className="text-xs text-muted-foreground">{formatKickoff(match.kickoff_at)}</p>
        </div>

        <div className="shrink-0 text-right">
          {hasScore ? (
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                resultTone === "win" && "text-green-500",
                resultTone === "loss" && "text-red-500",
                resultTone === "draw" && "text-muted-foreground",
              )}
            >
              {teamScore}
              <span className="mx-1 font-normal text-muted-foreground">–</span>
              {oppScore}
            </p>
          ) : (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {live ? "En cours" : "À venir"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
