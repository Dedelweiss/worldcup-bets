import { fifaNoFromMatchId } from "@/lib/tournament/knockout-match-display";
import type { BracketSlotWithMatch } from "@/types/database";

/** Ordre visuel gauche → droite pour l'arbre FIFA (paires consécutives = feeders). */
export const TREE_R32_LEFT = [73, 75, 74, 77, 76, 78, 79, 80] as const;
export const TREE_R32_RIGHT = [83, 84, 81, 82, 86, 88, 85, 87] as const;
export const TREE_R16_LEFT = [90, 89, 91, 92] as const;
export const TREE_R16_RIGHT = [93, 94, 95, 96] as const;
export const TREE_QF_LEFT = [97, 99] as const;
export const TREE_QF_RIGHT = [98, 100] as const;
export const TREE_SF_LEFT = [101] as const;
export const TREE_SF_RIGHT = [102] as const;

function slotFifaNo(slot: BracketSlotWithMatch): number | null {
  const id = slot.match?.id ?? slot.match_id;
  if (id == null) return null;
  return fifaNoFromMatchId(id);
}

export function orderSlotsForTree(
  slots: BracketSlotWithMatch[],
  fifaOrder: readonly number[],
): BracketSlotWithMatch[] {
  const byFifa = new Map<number, BracketSlotWithMatch>();
  for (const slot of slots) {
    const fifa = slotFifaNo(slot);
    if (fifa != null) byFifa.set(fifa, slot);
  }
  return fifaOrder
    .map((n) => byFifa.get(n))
    .filter((s): s is BracketSlotWithMatch => s != null);
}

export function findTreeSlot(
  slots: BracketSlotWithMatch[],
  fifaNo: number,
): BracketSlotWithMatch | undefined {
  return slots.find((s) => slotFifaNo(s) === fifaNo);
}
