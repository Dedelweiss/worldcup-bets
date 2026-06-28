import { Clock } from "lucide-react";
import { MATCH_RESULT_COPY } from "@/lib/bets/match-result-copy";
import { cn } from "@/lib/utils";

interface KnockoutRegulationNoteProps {
  className?: string;
  align?: "left" | "center";
}

/** Rappel affiché sur les matchs à élimination directe : paris sur le score à 90 min. */
export function KnockoutRegulationNote({
  className,
  align = "left",
}: KnockoutRegulationNoteProps) {
  return (
    <p
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90",
        align === "center" && "text-center",
        className,
      )}
    >
      <Clock
        className="mr-1.5 inline size-3.5 shrink-0 align-text-bottom"
        aria-hidden
      />
      {MATCH_RESULT_COPY.knockoutBetNote}
    </p>
  );
}
