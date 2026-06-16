"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getKickoffCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MatchKickoffCountdownProps {
  kickoffAt: string;
  className?: string;
}

/** Compte à rebours live avant coup d'envoi. */
export function MatchKickoffCountdown({
  kickoffAt,
  className,
}: MatchKickoffCountdownProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, [kickoffAt]);

  const countdown = now ? getKickoffCountdown(kickoffAt, now) : null;
  if (!countdown) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Clock
          className={cn(
            "size-4 shrink-0",
            countdown.urgent ? "text-red-400" : "text-primary",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "font-heading text-sm font-semibold tabular-nums sm:text-base",
            countdown.urgent ? "text-red-400" : "text-primary",
          )}
        >
          Coup d&apos;envoi dans {countdown.label}
        </span>
      </div>
      {countdown.progress > 0 && (
        <div
          className="h-0.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(countdown.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              countdown.urgent ? "bg-red-400/80" : "bg-primary/80",
            )}
            style={{ width: `${countdown.progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
