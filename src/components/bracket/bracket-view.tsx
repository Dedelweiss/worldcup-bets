import { BracketSlotCard } from "@/components/bracket/bracket-slot-card";
import { BracketTree } from "@/components/bracket/bracket-tree";
import { STAGE_LABELS } from "@/lib/tournament/constants";
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

interface BracketViewProps {
  slots: BracketSlotWithMatch[];
  betStatuses?: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
}

export function BracketView({ slots, betStatuses = {}, isAdmin }: BracketViewProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        L&apos;arbre n&apos;est pas encore configuré. Exécutez la migration 011
        dans Supabase.
      </p>
    );
  }

  const hasKnockoutTree = slots.some(
    (s) => s.stage === "r16" || s.stage === "r32" || s.stage === "final",
  );

  return (
    <>
      {/* Arbre type compétition (grand écran) */}
      {hasKnockoutTree && (
        <div className="hidden lg:block">
          <BracketTree slots={slots} betStatuses={betStatuses} isAdmin={isAdmin} />
        </div>
      )}

      {/* Liste par tour (mobile / tablette) */}
      <div className={hasKnockoutTree ? "lg:hidden" : ""}>
        <BracketMobileList slots={slots} betStatuses={betStatuses} isAdmin={isAdmin} />
      </div>
    </>
  );
}

function BracketMobileList({
  slots,
  betStatuses,
  isAdmin,
}: {
  slots: BracketSlotWithMatch[];
  betStatuses: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
}) {
  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    items: slots
      .filter((s) => s.stage === stage)
      .sort((a, b) => a.bracket_order - b.bracket_order),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-w-0 space-y-8 pb-2">
      {byStage.map(({ stage, label, items }) => (
        <section key={stage}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            {stage === "final" && <span aria-hidden>🏆</span>}
            <span className={stage === "final" ? "text-primary" : ""}>{label}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((slot) => (
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
      ))}
    </div>
  );
}
