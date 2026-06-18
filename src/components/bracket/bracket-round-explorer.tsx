"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { BracketSlotCard } from "@/components/bracket/bracket-slot-card";
import { STAGE_LABELS } from "@/lib/tournament/constants";
import { cn } from "@/lib/utils";
import type { BracketSlotDisplay } from "@/lib/tournament/bracket-projection";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { BracketSlotWithMatch, MatchStage } from "@/types/database";

const STAGE_ORDER: MatchStage[] = [
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

const STAGE_SHORT: Record<MatchStage, string> = {
  group: "Poules",
  r32: "32èmes",
  r16: "16èmes",
  qf: "Quarts",
  sf: "Demies",
  third_place: "3e place",
  final: "Finale",
};

function pickDefaultStage(slots: BracketSlotWithMatch[]): MatchStage {
  const withMatch = slots.filter((s) => s.match);

  const live = withMatch.find((s) => s.match?.status === "live");
  if (live) return live.stage;

  const scheduled = withMatch
    .filter((s) => s.match?.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.match!.kickoff_at).getTime() -
        new Date(b.match!.kickoff_at).getTime(),
    );
  if (scheduled[0]) return scheduled[0].stage;

  for (const stage of STAGE_ORDER) {
    if (slots.some((s) => s.stage === stage)) return stage;
  }

  return "final";
}

function stageBadgeTone(stage: MatchStage, slots: BracketSlotWithMatch[]) {
  const matches = slots
    .filter((s) => s.stage === stage && s.match)
    .map((s) => s.match!);
  if (matches.some((m) => m.status === "live")) return "live" as const;
  if (matches.some((m) => m.status === "scheduled")) return "upcoming" as const;
  if (matches.every((m) => m.status === "finished") && matches.length > 0) {
    return "done" as const;
  }
  return "idle" as const;
}

interface BracketRoundExplorerProps {
  slots: BracketSlotDisplay[];
  betStatuses?: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
}

export function BracketRoundExplorer({
  slots,
  betStatuses = {},
  isAdmin,
}: BracketRoundExplorerProps) {
  const stages = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
        short: STAGE_SHORT[stage],
        items: slots
          .filter((s) => s.stage === stage)
          .sort((a, b) => {
            const aKick = a.match?.kickoff_at ?? a.scheduled_kickoff;
            const bKick = b.match?.kickoff_at ?? b.scheduled_kickoff;
            if (aKick && bKick) {
              return new Date(aKick).getTime() - new Date(bKick).getTime();
            }
            return a.bracket_order - b.bracket_order;
          }),
      })).filter((s) => s.items.length > 0),
    [slots],
  );

  const defaultStage = useMemo(() => pickDefaultStage(slots), [slots]);
  const [activeStage, setActiveStage] = useState<MatchStage>(defaultStage);

  const active =
    stages.find((s) => s.stage === activeStage) ?? stages[0] ?? null;

  if (!active) return null;

  return (
    <div className="min-w-0 space-y-4">
      <div className="sticky top-[calc(var(--header-height,3.5rem)+0.5rem)] z-20 -mx-1 px-1 pb-1">
        <div
          className="flex gap-2 overflow-x-auto overscroll-x-contain rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-md [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Tours de la phase finale"
        >
          {stages.map(({ stage, short }) => {
            const tone = stageBadgeTone(stage, slots);
            const selected = activeStage === stage;
            return (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveStage(stage)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-[var(--dur-fast)]",
                  selected
                    ? stage === "final"
                      ? "bg-amber-500/15 text-amber-100 shadow-[0_0_20px_-8px] shadow-amber-500/40 ring-1 ring-amber-500/35"
                      : "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {stage === "final" && (
                  <Trophy
                    className={cn(
                      "size-3.5 shrink-0",
                      selected ? "text-amber-400" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                )}
                <span>{short}</span>
                {tone === "live" && (
                  <span
                    className="size-1.5 shrink-0 animate-pulse rounded-full bg-fuchsia-400"
                    aria-label="En direct"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="bracket-round-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              id="bracket-round-heading"
              className={cn(
                "font-heading text-lg font-semibold tracking-tight",
                active.stage === "final" && "text-amber-100",
              )}
            >
              {active.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {active.items.length} match{active.items.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {active.items.map((slot) => (
            <BracketSlotCard
              key={slot.id}
              slot={slot}
              betStatus={
                slot.match ? betStatuses[slot.match.id] : undefined
              }
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
