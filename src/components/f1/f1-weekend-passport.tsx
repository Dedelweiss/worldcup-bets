import type { F1Bet } from "@/types/f1";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface F1WeekendPassportProps {
  bets: {
    raceOrder: F1Bet | null;
    pole: F1Bet | null;
    teammate: F1Bet | null;
  };
}

const steps = [
  { key: "pole" as const, label: "Pole position" },
  { key: "teammate" as const, label: "Duel coéquipiers" },
  { key: "raceOrder" as const, label: "Top 10 ordonné" },
];

export function F1WeekendPassport({ bets }: F1WeekendPassportProps) {
  const done = steps.filter((s) => bets[s.key] != null).length;

  return (
    <section className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold">Pass week-end</h2>
        <span className="text-xs tabular-nums text-lime-400">
          {done}/{steps.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => {
          const completed = bets[step.key] != null;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-2 text-sm",
                completed ? "text-lime-300" : "text-zinc-500",
              )}
            >
              {completed ? (
                <Check className="size-4 shrink-0" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0" aria-hidden />
              )}
              {step.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
