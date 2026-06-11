"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { formatKickoff, getKickoffCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MatchTimingBannerProps {
  isLive: boolean;
  kickoffAt: string;
  round?: string | null;
  className?: string;
}

/** Bandeau léger pour les matchs à venir. Le temps live est affiché sur le score. */
export function MatchTimingBanner({
  isLive,
  kickoffAt,
  round,
  className,
}: MatchTimingBannerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (isLive) return;
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, [isLive]);

  if (isLive) return null;

  const countdown = getKickoffCountdown(kickoffAt, now);

  return (
    <div
      className={cn(
        "border-b border-white/5 bg-muted/30 px-4 py-2.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          <time
            dateTime={kickoffAt}
            className="truncate text-xs font-medium tabular-nums"
          >
            {formatKickoff(kickoffAt)}
          </time>
        </div>
        {countdown && (
          <span className="shrink-0 font-heading text-sm font-semibold tabular-nums text-foreground/90">
            {countdown.label}
          </span>
        )}
      </div>
      {round && (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {round}
        </p>
      )}
    </div>
  );
}
