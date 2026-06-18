import { BracketViewShell } from "@/components/bracket/bracket-view-shell";
import type {
  BracketProjectionMeta,
  BracketSlotDisplay,
} from "@/lib/tournament/bracket-projection";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";

interface BracketViewProps {
  slots: BracketSlotDisplay[];
  betStatuses?: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
  projectionMeta?: BracketProjectionMeta;
}

export function BracketView({
  slots,
  betStatuses = {},
  isAdmin,
  projectionMeta,
}: BracketViewProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)]/40 p-10 text-center text-muted-foreground">
        L&apos;arbre n&apos;est pas encore configuré. Exécutez la migration 011
        dans Supabase.
      </p>
    );
  }

  return (
    <BracketViewShell
      slots={slots}
      betStatuses={betStatuses}
      isAdmin={isAdmin}
      projectionMeta={projectionMeta}
    />
  );
}
