import { hasKickoffStarted } from "@/lib/format";
import type { MatchWithTeams } from "@/types/database";

export function canPlaceBetOnMatch(match: MatchWithTeams): {
  allowed: boolean;
  reason?: string;
} {
  if (match.status !== "scheduled") {
    return {
      allowed: false,
      reason:
        match.status === "finished"
          ? "Ce match est terminé."
          : "Les paris sont fermés pour ce match.",
    };
  }
  if (hasKickoffStarted(match.kickoff_at)) {
    return { allowed: false, reason: "Le coup d'envoi est passé." };
  }
  if (!match.odd_home || !match.odd_draw || !match.odd_away) {
    return {
      allowed: false,
      reason: "Les cotes ne sont pas encore disponibles.",
    };
  }
  return { allowed: true };
}
