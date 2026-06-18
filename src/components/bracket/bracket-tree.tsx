"use client";

import { BracketTreeNode } from "@/components/bracket/bracket-tree-node";
import { TbdTeamBadge } from "@/components/shared/tbd-team-badge";
import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/tournament/constants";
import {
  findTreeSlot,
  orderSlotsForTree,
  TREE_QF_LEFT,
  TREE_QF_RIGHT,
  TREE_R16_LEFT,
  TREE_R16_RIGHT,
  TREE_R32_LEFT,
  TREE_R32_RIGHT,
  TREE_SF_LEFT,
  TREE_SF_RIGHT,
} from "@/lib/tournament/bracket-tree-layout";
import { Trophy, ZoomOut } from "lucide-react";
import type { BracketSlotDisplay } from "@/lib/tournament/bracket-projection";
import type { BracketSlotWithMatch, MatchStage } from "@/types/database";

interface BracketTreeProps {
  slots: BracketSlotDisplay[];
  /** Inclut les 32es (format CDM 2026). */
  full?: boolean;
}

function byStage(slots: BracketSlotWithMatch[], stage: MatchStage) {
  return slots
    .filter((s) => s.stage === stage)
    .sort((a, b) => a.bracket_order - b.bracket_order);
}

function splitHalf(items: BracketSlotWithMatch[]) {
  const mid = Math.ceil(items.length / 2);
  return { left: items.slice(0, mid), right: items.slice(mid) };
}

function BracketPairColumn({
  slots,
  side,
}: {
  slots: BracketSlotWithMatch[];
  side: "left" | "right";
}) {
  const pairs: BracketSlotWithMatch[][] = [];
  for (let i = 0; i < slots.length; i += 2) {
    pairs.push(slots.slice(i, i + 2));
  }

  return (
    <div className="flex flex-col justify-around gap-2 py-3">
      {pairs.map((pair, idx) => (
        <div
          key={`${side}-pair-${idx}`}
          className={cn(
            "relative flex flex-col gap-1.5",
            side === "left" ? "pr-4" : "pl-4",
          )}
        >
          {pair.map((slot) => (
            <BracketTreeNode key={slot.id} slot={slot} />
          ))}
          {pair.length === 2 && (
            <BracketConnector side={side} variant="pair" />
          )}
        </div>
      ))}
    </div>
  );
}

function BracketConnector({
  side,
  variant,
}: {
  side: "left" | "right";
  variant: "pair" | "single";
}) {
  const lineClass =
    "border-[var(--color-line-strong)] bg-gradient-to-b from-transparent via-primary/30 to-transparent";

  if (variant === "pair") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute top-[14%] bottom-[14%] w-3.5 border-t border-b",
          lineClass,
          side === "left"
            ? "right-0 rounded-r border-r"
            : "left-0 rounded-l border-l",
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 h-px w-3.5 -translate-y-1/2 bg-gradient-to-r from-primary/45 to-primary/10",
        side === "left" ? "right-0" : "left-0 rotate-180",
      )}
      aria-hidden
    />
  );
}

function SingleSlotColumn({
  slot,
  side,
  highlight,
}: {
  slot: BracketSlotWithMatch | undefined;
  side: "left" | "right";
  highlight?: boolean;
}) {
  if (!slot) return <div className="min-h-[52px]" />;
  return (
    <div
      className={cn(
        "relative flex items-center py-4",
        side === "left" ? "pr-4" : "pl-4",
      )}
    >
      <BracketTreeNode slot={slot} highlight={highlight} />
      <BracketConnector side={side} variant="single" />
    </div>
  );
}

function RoundLabel({
  label,
  className,
  icon,
}: {
  label: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  if (!label) return <div className="h-7" />;
  return (
    <div
      className={cn(
        "sticky top-14 z-10 flex items-center justify-center gap-1 py-2",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-raised)]/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
        {icon}
        {label}
      </span>
    </div>
  );
}

function FinalColumn({
  finalSlot,
  thirdSlot,
}: {
  finalSlot: BracketSlotWithMatch | undefined;
  thirdSlot: BracketSlotWithMatch | undefined;
}) {
  return (
    <div className="relative flex min-w-[168px] flex-col items-center justify-center border-x border-amber-500/25 bg-gradient-to-b from-amber-500/[0.1] via-[var(--color-surface-raised)] to-[var(--color-surface)] px-3 py-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
        aria-hidden
      />
      <RoundLabel
        label="Finale"
        className="text-amber-200"
        icon={<Trophy className="size-2.5 text-amber-400" aria-hidden />}
      />
      <div className="mt-1 w-full">
        {finalSlot ? (
          <BracketTreeNode slot={finalSlot} highlight />
        ) : (
          <div className="rounded-[var(--radius-card)] border-2 border-dashed border-amber-500/35 bg-amber-500/[0.06] p-4 text-center">
            <div className="mx-auto flex w-fit gap-1.5">
              <TbdTeamBadge size={28} />
              <TbdTeamBadge size={28} />
            </div>
            <p className="mt-2 font-heading text-xs font-semibold text-amber-100/90">
              Finale
            </p>
          </div>
        )}
      </div>
      {thirdSlot && (
        <div className="mt-5 w-full">
          <p className="mb-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {STAGE_LABELS.third_place}
          </p>
          <BracketTreeNode slot={thirdSlot} />
        </div>
      )}
    </div>
  );
}

export function BracketTree({ slots, full = false }: BracketTreeProps) {
  const hasR32 = slots.some((s) => s.stage === "r32");
  const useFull = full && hasR32;

  const r32Left = orderSlotsForTree(slots, TREE_R32_LEFT);
  const r32Right = orderSlotsForTree(slots, TREE_R32_RIGHT);
  const r16Left = orderSlotsForTree(slots, TREE_R16_LEFT);
  const r16Right = orderSlotsForTree(slots, TREE_R16_RIGHT);
  const qfLeft = orderSlotsForTree(slots, TREE_QF_LEFT);
  const qfRight = orderSlotsForTree(slots, TREE_QF_RIGHT);
  const sfLeft = findTreeSlot(slots, TREE_SF_LEFT[0]);
  const sfRight = findTreeSlot(slots, TREE_SF_RIGHT[0]);
  const finalSlot = byStage(slots, "final")[0];
  const thirdSlot = byStage(slots, "third_place")[0];

  const r16 = byStage(slots, "r16");
  const r32 = byStage(slots, "r32");
  const qf = byStage(slots, "qf");
  const sf = byStage(slots, "sf");

  const classicFirst = r16.length > 0 ? r16 : r32;
  const classicHalf = splitHalf(classicFirst);
  const classicQf = splitHalf(qf);

  if (!useFull && !classicFirst.length && !finalSlot) {
    return null;
  }

  if (useFull && r32Left.length === 0 && !finalSlot) {
    return null;
  }

  const stageSummary = useFull
    ? "32es · 16es · Quarts · Demies · Finale"
    : `${r16.length > 0 ? STAGE_LABELS.r16 : STAGE_LABELS.r32} · Quarts · Demies · Finale`;

  const gridClass = useFull
    ? "grid-cols-[1fr_1fr_1fr_1fr_auto_1fr_1fr_1fr_1fr]"
    : "grid-cols-[1fr_1fr_1fr_auto_1fr_1fr_1fr]";

  const minWidth = useFull ? "min-w-[1280px]" : "min-w-[960px]";

  return (
    <div className="w-full min-w-0 space-y-2">
      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground xl:justify-end">
        <ZoomOut className="size-3 shrink-0 opacity-60" aria-hidden />
        Glissez horizontalement pour explorer l&apos;arbre
      </p>

      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-[var(--radius-modal)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] pb-2 [-webkit-overflow-scrolling:touch]">
        <div className={cn("mx-auto w-max px-2 py-3", minWidth)}>
          <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {stageSummary}
          </p>

          <div className={cn("grid items-stretch gap-0", gridClass)}>
            {useFull && (
              <div className="flex flex-col border-r border-[var(--color-line)]/60">
                <RoundLabel label={STAGE_LABELS.r32} />
                <BracketPairColumn slots={r32Left} side="left" />
              </div>
            )}

            <div
              className={cn(
                "flex flex-col",
                useFull && "border-r border-[var(--color-line)]/60",
              )}
            >
              <RoundLabel
                label={useFull ? STAGE_LABELS.r16 : r16.length > 0 ? STAGE_LABELS.r16 : STAGE_LABELS.r32}
              />
              <BracketPairColumn
                slots={useFull ? r16Left : classicHalf.left}
                side="left"
              />
            </div>

            <div className="flex flex-col border-r border-[var(--color-line)]/60">
              <RoundLabel label={STAGE_LABELS.qf} />
              <BracketPairColumn
                slots={useFull ? qfLeft : splitHalf(qf).left}
                side="left"
              />
            </div>

            <div className="flex flex-col border-r border-[var(--color-line)]/60">
              <RoundLabel label={STAGE_LABELS.sf} />
              <SingleSlotColumn
                slot={useFull ? sfLeft : sf[0]}
                side="left"
              />
            </div>

            <FinalColumn finalSlot={finalSlot} thirdSlot={thirdSlot} />

            <div className="flex flex-col border-l border-[var(--color-line)]/60">
              <RoundLabel label={STAGE_LABELS.sf} />
              <SingleSlotColumn
                slot={useFull ? sfRight : sf[1] ?? sf[0]}
                side="right"
              />
            </div>

            <div className="flex flex-col border-l border-[var(--color-line)]/60">
              <RoundLabel label={STAGE_LABELS.qf} />
              <BracketPairColumn
                slots={useFull ? qfRight : splitHalf(qf).right}
                side="right"
              />
            </div>

            <div
              className={cn(
                "flex flex-col",
                useFull && "border-l border-[var(--color-line)]/60",
              )}
            >
              <RoundLabel
                label={useFull ? STAGE_LABELS.r16 : r16.length > 0 ? STAGE_LABELS.r16 : STAGE_LABELS.r32}
              />
              <BracketPairColumn
                slots={useFull ? r16Right : classicHalf.right}
                side="right"
              />
            </div>

            {useFull && (
              <div className="flex flex-col border-l border-[var(--color-line)]/60">
                <RoundLabel label={STAGE_LABELS.r32} />
                <BracketPairColumn slots={r32Right} side="right" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
