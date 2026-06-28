"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  ACTIVE_SPORT_STORAGE_KEY,
  type ActiveSport,
  SPORT_LABELS,
} from "@/lib/sport/constants";
import { sportHomePath } from "@/lib/sport/constants";
import { setActiveSportAction } from "@/app/(app)/sport/actions";
import { cn } from "@/lib/utils";

interface SportSwitchProps {
  activeSport: ActiveSport;
  f1Enabled?: boolean;
  className?: string;
}

export function SportSwitch({
  activeSport,
  f1Enabled = true,
  className,
}: SportSwitchProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(sport: ActiveSport) {
    if (sport === activeSport || pending) return;
    if (sport === "f1" && !f1Enabled) {
      toast.error("Le mode F1 est temporairement désactivé.");
      return;
    }

    startTransition(async () => {
      try {
        localStorage.setItem(ACTIVE_SPORT_STORAGE_KEY, sport);
        await setActiveSportAction(sport);
        router.push(sportHomePath(sport));
        router.refresh();
      } catch {
        toast.error("Impossible de changer de mode.");
      }
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-zinc-900/80 p-0.5 text-xs",
        className,
      )}
      role="group"
      aria-label="Choisir le sport"
    >
      {(["football", "f1"] as const).map((sport) => {
        const active = sport === activeSport;
        const disabled = sport === "f1" && !f1Enabled;
        const label = SPORT_LABELS[sport];
        return (
          <button
            key={sport}
            type="button"
            disabled={disabled || pending}
            onClick={() => switchTo(sport)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition-colors",
              active
                ? "bg-lime-400/20 text-lime-300"
                : "text-zinc-400 hover:text-zinc-200",
              disabled && "cursor-not-allowed opacity-40",
            )}
            aria-pressed={active}
          >
            <span aria-hidden>{label.emoji}</span>{" "}
            <span className="hidden sm:inline">{label.short}</span>
          </button>
        );
      })}
    </div>
  );
}
