"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";

interface OnboardingProgressProps {
  current: number;
  total: number;
  accentClass?: string;
  className?: string;
}

export function OnboardingProgress({
  current,
  total,
  accentClass = "bg-primary",
  className,
}: OnboardingProgressProps) {
  const isClient = useIsClient();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Étape {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/30">
        {isClient ? (
          <>
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                accentClass,
              )}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
            <motion.div
              className="absolute inset-y-0 w-8 rounded-full bg-white/25 blur-sm"
              initial={false}
              animate={{ left: `${Math.max(pct - 5, 0)}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </>
        ) : (
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              accentClass,
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
