"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_GOALS = 20;

/** Scores fréquents en phase de poules / matchs serrés */
export const QUICK_SCORES: { home: number; away: number; label: string }[] = [
  { home: 0, away: 0, label: "0-0" },
  { home: 1, away: 0, label: "1-0" },
  { home: 0, away: 1, label: "0-1" },
  { home: 1, away: 1, label: "1-1" },
  { home: 2, away: 0, label: "2-0" },
  { home: 0, away: 2, label: "0-2" },
  { home: 2, away: 1, label: "2-1" },
  { home: 1, away: 2, label: "1-2" },
  { home: 3, away: 0, label: "3-0" },
  { home: 0, away: 3, label: "0-3" },
];

type TeamInfo = {
  name: string;
  code?: string | null;
  logo_url?: string | null;
};

interface ScorePickerProps {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeScore: string;
  awayScore: string;
  onHomeChange: (value: string) => void;
  onAwayChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function parseScore(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(MAX_GOALS, n));
}

function TeamBadge({ team }: { team: TeamInfo }) {
  const initials = (team.code ?? team.name.slice(0, 3)).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-1.5 px-1">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover ring-1 ring-border"
          unoptimized
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border">
          {initials}
        </div>
      )}
      <span className="max-w-[5.5rem] truncate text-center text-xs font-medium leading-tight">
        {team.name}
      </span>
      {team.code && (
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          {team.code}
        </span>
      )}
    </div>
  );
}

function ScoreStepper({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const current = parseScore(value);
  const display = current === null ? "–" : String(current);

  function setScore(next: number) {
    onChange(String(Math.max(0, Math.min(MAX_GOALS, next))));
  }

  function increment() {
    setScore((current ?? -1) + 1);
  }

  function decrement() {
    if (current === null) return;
    setScore(current - 1);
  }

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-full"
        disabled={disabled || current === MAX_GOALS}
        onClick={increment}
        aria-label={`Augmenter ${ariaLabel}`}
      >
        <Plus className="size-4" />
      </Button>

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-background text-3xl font-bold tabular-nums tracking-tight transition-colors",
          current === null
            ? "border-dashed border-muted-foreground/30 text-muted-foreground"
            : "border-primary/40 text-foreground shadow-inner",
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {display}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-full"
        disabled={disabled || current === 0}
        onClick={decrement}
        aria-label={`Diminuer ${ariaLabel}`}
      >
        <Minus className="size-4" />
      </Button>
    </div>
  );
}

export function ScorePicker({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  onHomeChange,
  onAwayChange,
  disabled,
  className,
}: ScorePickerProps) {
  const homeN = parseScore(homeScore);
  const awayN = parseScore(awayScore);
  const isQuickActive = (h: number, a: number) => homeN === h && awayN === a;

  function applyQuick(home: number, away: number) {
    onHomeChange(String(home));
    onAwayChange(String(away));
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border bg-gradient-to-b from-muted/40 to-muted/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <TeamBadge team={homeTeam} />

          <div className="flex shrink-0 items-center gap-2 px-1">
            <ScoreStepper
              value={homeScore}
              onChange={onHomeChange}
              disabled={disabled}
              ariaLabel={`buts ${homeTeam.name}`}
            />
            <span
              className="pb-1 text-2xl font-light text-muted-foreground"
              aria-hidden
            >
              :
            </span>
            <ScoreStepper
              value={awayScore}
              onChange={onAwayChange}
              disabled={disabled}
              ariaLabel={`buts ${awayTeam.name}`}
            />
          </div>

          <TeamBadge team={awayTeam} />
        </div>

        {(homeN !== null || awayN !== null) && (
          <p className="mt-4 text-center text-lg font-semibold tabular-nums text-primary">
            {homeN ?? 0} – {awayN ?? 0}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-center text-xs font-medium text-muted-foreground">
          Scores fréquents
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {QUICK_SCORES.map((q) => {
            const active = isQuickActive(q.home, q.away);
            return (
              <Button
                key={q.label}
                type="button"
                variant={active ? "default" : "outline"}
                size="xs"
                disabled={disabled}
                className={cn(
                  "min-w-[2.75rem] font-mono tabular-nums",
                  active && "ring-2 ring-primary/30",
                )}
                onClick={() => applyQuick(q.home, q.away)}
              >
                {q.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
