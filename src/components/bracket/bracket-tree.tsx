import { BracketSlotCard } from "@/components/bracket/bracket-slot-card";
import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/tournament/constants";
import type { BracketSlotWithMatch, MatchStage } from "@/types/database";

interface BracketTreeProps {
  slots: BracketSlotWithMatch[];
  isAdmin?: boolean;
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

/** Paire de matchs avec connecteur vers le tour suivant */
function BracketPairColumn({
  slots,
  side,
  isAdmin,
}: {
  slots: BracketSlotWithMatch[];
  side: "left" | "right";
  isAdmin?: boolean;
}) {
  const pairs: BracketSlotWithMatch[][] = [];
  for (let i = 0; i < slots.length; i += 2) {
    pairs.push(slots.slice(i, i + 2));
  }

  return (
    <div className="flex flex-col justify-around gap-2 py-4">
      {pairs.map((pair, idx) => (
        <div
          key={`${side}-pair-${idx}`}
          className={cn(
            "relative flex flex-col gap-2",
            side === "left" ? "pr-5" : "pl-5",
          )}
        >
          {pair.map((slot) => (
            <BracketSlotCard
              key={slot.id}
              slot={slot}
              compact
              isAdmin={isAdmin}
            />
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
  side: "left" | "right" | "center";
  variant: "pair" | "single" | "to-final";
}) {
  if (variant === "pair") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute top-[12%] bottom-[12%] w-4 border-primary/35",
          side === "left"
            ? "right-0 rounded-r border-r border-t border-b"
            : "left-0 rounded-l border-l border-t border-b",
        )}
        aria-hidden
      />
    );
  }

  if (variant === "single") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 h-px w-4 -translate-y-1/2 bg-primary/35",
          side === "left" ? "right-0" : "left-0",
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 h-px w-6 -translate-y-1/2 bg-primary/40",
        side === "left" ? "-right-6" : "-left-6",
      )}
      aria-hidden
    />
  );
}

function SingleSlotColumn({
  slot,
  side,
  isAdmin,
  highlight,
}: {
  slot: BracketSlotWithMatch | undefined;
  side: "left" | "right";
  isAdmin?: boolean;
  highlight?: boolean;
}) {
  if (!slot) return <div className="min-h-[80px]" />;
  return (
    <div
      className={cn(
        "relative flex items-center py-6",
        side === "left" ? "pr-5" : "pl-5",
      )}
    >
      <BracketSlotCard
        slot={slot}
        compact
        isAdmin={isAdmin}
        highlight={highlight}
      />
      <BracketConnector side={side} variant="single" />
    </div>
  );
}

export function BracketTree({ slots, isAdmin }: BracketTreeProps) {
  const r16 = byStage(slots, "r16");
  const r32 = byStage(slots, "r32");
  const qf = byStage(slots, "qf");
  const sf = byStage(slots, "sf");
  const finals = byStage(slots, "final");
  const third = byStage(slots, "third_place");

  const firstRound = r16.length > 0 ? r16 : r32;
  const firstLabel =
    r16.length > 0 ? STAGE_LABELS.r16 : r32.length > 0 ? STAGE_LABELS.r32 : "";

  const r1 = splitHalf(firstRound);
  const qfHalf = splitHalf(qf);
  const sfLeft = sf[0];
  const sfRight = sf[1] ?? sf[0];
  const finalSlot = finals[0];
  const thirdSlot = third[0];

  if (!firstRound.length && !finalSlot) {
    return null;
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl border border-white/10 bg-zinc-900/30 pb-4 [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-max min-w-[min(920px,100%)] max-w-[1400px] px-2 sm:min-w-[720px] lg:min-w-[920px]">
        {firstLabel && (
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {firstLabel} → Quarts → Demies → Finale
          </p>
        )}

        <div className="grid grid-cols-[1fr_1fr_1fr_auto_1fr_1fr_1fr] items-stretch gap-0">
          {/* Gauche */}
          <div className="flex flex-col">
            <RoundLabel label={firstLabel} />
            <BracketPairColumn slots={r1.left} side="left" isAdmin={isAdmin} />
          </div>

          <div className="flex flex-col border-l border-primary/10">
            <RoundLabel label={STAGE_LABELS.qf} />
            <BracketPairColumn slots={qfHalf.left} side="left" isAdmin={isAdmin} />
          </div>

          <div className="flex flex-col border-l border-primary/10">
            <RoundLabel label={STAGE_LABELS.sf} />
            <SingleSlotColumn
              slot={sfLeft}
              side="left"
              isAdmin={isAdmin}
            />
          </div>

          {/* Centre — finale */}
          <div className="flex min-w-[200px] flex-col items-center justify-center border-x border-primary/20 bg-primary/5 px-4 py-6">
            <RoundLabel label="Finale" className="text-primary" />
            <div className="relative w-full max-w-[220px]">
              {finalSlot ? (
                <BracketSlotCard
                  slot={finalSlot}
                  isAdmin={isAdmin}
                  highlight
                />
              ) : (
                <div className="rounded-xl border-2 border-dashed border-primary/40 bg-card/50 p-6 text-center">
                  <span className="text-2xl" aria-hidden>
                    🏆
                  </span>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    Finale
                  </p>
                  <p className="text-xs text-muted-foreground/70">À définir</p>
                </div>
              )}
            </div>
            {thirdSlot && (
              <div className="mt-6 w-full max-w-[200px]">
                <p className="mb-2 text-center text-[10px] font-medium uppercase text-muted-foreground">
                  {STAGE_LABELS.third_place}
                </p>
                <BracketSlotCard slot={thirdSlot} compact isAdmin={isAdmin} />
              </div>
            )}
          </div>

          {/* Droite (miroir) */}
          <div className="flex flex-col border-r border-primary/10">
            <RoundLabel label={STAGE_LABELS.sf} />
            <SingleSlotColumn
              slot={sfRight}
              side="right"
              isAdmin={isAdmin}
            />
          </div>

          <div className="flex flex-col border-r border-primary/10">
            <RoundLabel label={STAGE_LABELS.qf} />
            <BracketPairColumn slots={qfHalf.right} side="right" isAdmin={isAdmin} />
          </div>

          <div className="flex flex-col">
            <RoundLabel label={firstLabel} />
            <BracketPairColumn slots={r1.right} side="right" isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundLabel({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  if (!label) return <div className="h-6" />;
  return (
    <p
      className={cn(
        "sticky top-14 z-10 bg-zinc-950/95 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm md:top-14",
        className,
      )}
    >
      {label}
    </p>
  );
}
