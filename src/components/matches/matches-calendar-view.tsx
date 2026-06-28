"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { TeamFlag } from "@/components/shared/team-flag";
import { canPlaceBetOnMatch } from "@/lib/bets/can-place-bet-on-match";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import {
  buildMonthGrid,
  defaultCalendarMonth,
  formatDayOfMonth,
  formatMatchTimeParis,
  formatMonthLabel,
  getParisTodayKey,
  groupMatchesByDayKey,
  isDayInMonth,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/matches/month-calendar-grid";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

const MAX_MATCHES_IN_CELL = 4;

interface MatchesCalendarViewProps {
  matches: MatchWithTeams[];
  betStatuses?: Record<number, UserMatchBetStatus>;
}

export function MatchesCalendarView({
  matches,
  betStatuses = {},
}: MatchesCalendarViewProps) {
  const [month, setMonth] = useState(() => defaultCalendarMonth(matches));
  const todayKey = getParisTodayKey();
  const matchesByDay = useMemo(() => groupMatchesByDayKey(matches), [matches]);
  const gridDays = useMemo(() => buildMonthGrid(month), [month]);

  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 p-10 text-center text-muted-foreground">
        Aucun match dans cette sélection.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="font-heading text-lg font-bold capitalize tracking-tight text-foreground sm:text-xl">
          {formatMonthLabel(month)}
        </h2>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Mois suivant"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-white/10 bg-zinc-900/80">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {gridDays.map((dayKey) => {
              const dayMatches = matchesByDay.get(dayKey) ?? [];
              const inMonth = isDayInMonth(dayKey, month);
              const isToday = dayKey === todayKey;

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "flex min-h-[7.5rem] flex-col border-b border-r border-white/[0.06] p-1.5 sm:min-h-[8.5rem] sm:p-2",
                    !inMonth && "bg-zinc-950/60",
                    isToday && "bg-lime-400/[0.08] ring-1 ring-inset ring-lime-400/40",
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums sm:size-7 sm:text-sm",
                        isToday && "bg-lime-400 text-black shadow-md shadow-lime-400/30",
                        !isToday && inMonth && "text-zinc-200",
                        !isToday && !inMonth && "text-zinc-600",
                      )}
                    >
                      {formatDayOfMonth(dayKey)}
                    </span>
                    {isToday && (
                      <span className="hidden text-[9px] font-semibold uppercase tracking-wide text-lime-400 sm:inline">
                        Auj.
                      </span>
                    )}
                  </div>

                  <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                    {dayMatches.slice(0, MAX_MATCHES_IN_CELL).map((match) => (
                      <CalendarCellMatch
                        key={match.id}
                        match={match}
                        betStatus={betStatuses[match.id]}
                      />
                    ))}
                    {dayMatches.length > MAX_MATCHES_IN_CELL && (
                      <li className="px-1 text-[10px] font-medium text-zinc-500">
                        +{dayMatches.length - MAX_MATCHES_IN_CELL} match
                        {dayMatches.length - MAX_MATCHES_IN_CELL > 1 ? "s" : ""}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Fuseau horaire : Europe/Paris · Cliquez un match pour parier
      </p>
    </div>
  );
}

function CalendarCellMatch({
  match,
  betStatus,
}: {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
}) {
  const isLive = match.status === "live";
  const { allowed: bettingOpen } = canPlaceBetOnMatch(match);
  const hasBet = betStatus?.hasClassicBet;
  const hasScore = match.home_score != null && match.away_score != null;

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className={cn(
          "flex flex-col gap-0.5 rounded-md border px-1.5 py-1 transition-colors hover:bg-white/[0.06]",
          isLive && "border-fuchsia-500/35 bg-fuchsia-500/10",
          !isLive && bettingOpen && !hasBet && "border-lime-400/25 bg-lime-400/[0.06]",
          !isLive && hasBet && "border-primary/25 bg-primary/10",
          !isLive && !bettingOpen && !hasBet && "border-white/[0.08] bg-white/[0.03]",
          match.is_golden && "ring-1 ring-amber-500/30",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <time
            dateTime={match.kickoff_at}
            className="text-[10px] font-bold tabular-nums text-lime-300"
          >
            {formatMatchTimeParis(match.kickoff_at)}
          </time>
          {isLive && (
            <Radio className="size-2.5 shrink-0 animate-pulse text-fuchsia-400" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 items-center gap-0.5">
          <TeamFlag
            name={match.home_team.name}
            code={match.home_team.code}
            logoUrl={match.home_team.logo_url}
            teamId={match.home_team.id}
            size={14}
          />
          <span className="truncate text-[10px] font-medium leading-tight text-zinc-300">
            {shortTeamName(match.home_team)}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-0.5">
          <TeamFlag
            name={match.away_team.name}
            code={match.away_team.code}
            logoUrl={match.away_team.logo_url}
            teamId={match.away_team.id}
            size={14}
          />
          <span className="truncate text-[10px] font-medium leading-tight text-zinc-300">
            {shortTeamName(match.away_team)}
          </span>
        </div>

        {hasScore && (
          <p className="text-[10px] font-bold tabular-nums text-foreground">
            {match.home_score}–{match.away_score}
          </p>
        )}
      </Link>
    </li>
  );
}

function shortTeamName(team: MatchWithTeams["home_team"]): string {
  const display = tbdTeamDisplayName(team);
  if (display.length <= 12) return display;
  return `${display.slice(0, 11)}…`;
}
