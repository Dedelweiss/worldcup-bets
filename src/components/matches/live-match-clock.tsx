"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatLiveClock,
  resolveLiveClock,
} from "@/lib/football-data/parse-match";
import { cn } from "@/lib/utils";

interface LiveMatchClockProps {
  kickoffAt: string;
  minute?: number | null;
  injuryTime?: number | null;
  clockAnchorAt?: string | null;
  clockManual?: boolean;
  size?: "sm" | "md" | "lg";
  showLiveLabel?: boolean;
  showPhase?: boolean;
  className?: string;
}

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2 shrink-0", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-70" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500 shadow-[0_0_6px_1px] shadow-red-500/60" />
    </span>
  );
}

const MINUTE_SIZE = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl sm:text-6xl",
} as const;

const STOPPAGE_SIZE = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
} as const;

/** Horloge de match en direct — style overlay TV / appli sport. */
export function LiveMatchClock({
  kickoffAt,
  minute,
  injuryTime,
  clockAnchorAt,
  clockManual,
  size = "md",
  showLiveLabel = true,
  showPhase = true,
  className,
}: LiveMatchClockProps) {
  const manualClock = Boolean(clockManual) && Boolean(clockAnchorAt);
  const needsTick = manualClock || minute == null;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tickMs = needsTick ? 1_000 : 30_000;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [needsTick, clockAnchorAt, clockManual, minute]);

  const clock = useMemo(() => {
    if (now == null) {
      // Évite d'afficher une minute figée avant le montage client (chrono manuel).
      if (!needsTick && minute != null && minute >= 0) {
        return resolveLiveClock({ kickoffAt, minute, injuryTime });
      }
      return null;
    }
    return resolveLiveClock({
      kickoffAt,
      minute,
      injuryTime,
      clockAnchorAt,
      clockManual,
      now,
    });
  }, [kickoffAt, minute, injuryTime, clockAnchorAt, clockManual, now, needsTick]);

  const ariaLabel = clock
    ? clock.phase === "half_time"
      ? "Mi-temps"
      : formatLiveClock(clock.minute, clock.injuryTime) ?? "Match en direct"
    : "Match en direct";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-lg bg-zinc-950 px-2.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-white/15",
        size === "sm" && "min-w-[3.5rem] px-2 py-1",
        size === "lg" && "min-w-[5.5rem] px-4 py-3",
        className,
      )}
      role="status"
      aria-label={`Temps de jeu : ${ariaLabel}`}
      aria-live="polite"
    >
      {showLiveLabel && (
        <div className="mb-0.5 flex items-center gap-1">
          <LiveDot className={size === "lg" ? "size-2.5" : "size-2"} />
          <span
            className={cn(
              "font-heading font-bold uppercase tracking-[0.2em] text-red-400",
              size === "sm" ? "text-[8px]" : size === "md" ? "text-[9px]" : "text-[10px]",
            )}
          >
            Direct
          </span>
        </div>
      )}

      {clock ? (
        <>
          {clock.phase === "half_time" ? (
            <span
              className={cn(
                "font-heading font-bold uppercase tracking-wide text-white",
                size === "sm" ? "text-sm" : size === "md" ? "text-lg" : "text-2xl",
              )}
            >
              Mi-temps
            </span>
          ) : (
            <div className="flex items-baseline leading-none">
              <span
                className={cn(
                  "font-heading font-bold tabular-nums text-white",
                  MINUTE_SIZE[size],
                )}
              >
                {clock.displayMinute}
              </span>
              {clock.isStoppageTime && clock.injuryTime != null && (
                <span
                  className={cn(
                    "ml-px font-heading font-bold tabular-nums text-red-400",
                    STOPPAGE_SIZE[size],
                  )}
                >
                  +{clock.injuryTime}
                </span>
              )}
              <span
                className={cn(
                  "font-heading font-semibold text-white/80",
                  size === "sm" ? "text-sm" : size === "md" ? "text-lg" : "text-2xl",
                )}
              >
                &apos;
              </span>
            </div>
          )}
          {showPhase && clock.phase !== "half_time" && (
            <span
              className={cn(
                "mt-0.5 font-medium uppercase tracking-wide text-zinc-500",
                size === "sm" ? "text-[8px]" : size === "md" ? "text-[9px]" : "text-[10px]",
              )}
            >
              {clock.phaseLabel}
            </span>
          )}
        </>
      ) : (
        <span
          className={cn(
            "font-heading font-bold tabular-nums text-white",
            MINUTE_SIZE[size],
          )}
        >
          Live
        </span>
      )}
    </div>
  );
}
