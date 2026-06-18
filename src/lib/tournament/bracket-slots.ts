import { getKnockoutMatchDisplay } from "@/lib/tournament/knockout-match-display";
import type { BracketSlotWithMatch, MatchStage, MatchWithTeams } from "@/types/database";

const KNOCKOUT_STAGES: MatchStage[] = [
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

function knockoutByStage(
  matches: MatchWithTeams[],
): Map<MatchStage, MatchWithTeams[]> {
  const map = new Map<MatchStage, MatchWithTeams[]>();
  for (const stage of KNOCKOUT_STAGES) {
    map.set(
      stage,
      matches
        .filter((m) => m.stage === stage)
        .sort((a, b) => a.id - b.id),
    );
  }
  return map;
}

/** Relie les matchs de phase finale aux slots (par match_id ou ordre dans le tour). */
export function enrichBracketSlotsWithKnockoutMatches(
  slots: BracketSlotWithMatch[],
  knockoutMatches: MatchWithTeams[],
): BracketSlotWithMatch[] {
  const byId = new Map(knockoutMatches.map((m) => [m.id, m]));
  const byStage = knockoutByStage(knockoutMatches);

  const enriched = slots.map((slot) => {
    let match =
      slot.match ??
      (slot.match_id != null ? (byId.get(slot.match_id) ?? null) : null);

    if (!match) {
      const list = byStage.get(slot.stage) ?? [];
      match = list[slot.bracket_order - 1] ?? null;
    }

    if (!match) {
      return { ...slot, scheduled_kickoff: null };
    }

    return {
      ...slot,
      match_id: match.id,
      match,
      scheduled_kickoff: match.kickoff_at,
    };
  });

  const hasR32Slots = enriched.some((s) => s.stage === "r32");
  const r32List = byStage.get("r32") ?? [];

  if (!hasR32Slots && r32List.length > 0) {
    const virtual: BracketSlotWithMatch[] = r32List.map((m, i) => {
      const display = getKnockoutMatchDisplay(m.id);
      return {
        id: `r32-${m.id}`,
        stage: "r32",
        label: display?.title ?? m.round ?? `32es de finale · ${i + 1}`,
        bracket_order: display?.fifaNo ?? i + 1,
        match_id: m.id,
        match: m,
        scheduled_kickoff: m.kickoff_at,
      };
    });
    return [...virtual, ...enriched];
  }

  return enriched;
}
