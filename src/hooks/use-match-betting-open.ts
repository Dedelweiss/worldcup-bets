"use client";

import { useEffect, useState } from "react";
import { hasKickoffStarted } from "@/lib/format";
import type { MatchWithTeams } from "@/types/database";

/** Paris classiques : fermés dès que le coup d'envoi est passé ou si le match n'est plus « scheduled ». */
export function useClassicBettingOpen(match: MatchWithTeams) {
  const [open, setOpen] = useState(() => isClassicBettingOpen(match));

  useEffect(() => {
    setOpen(isClassicBettingOpen(match));

    if (match.status !== "scheduled") return;

    if (hasKickoffStarted(match.kickoff_at)) return;

    const msUntilKickoff =
      new Date(match.kickoff_at).getTime() - Date.now();
    if (msUntilKickoff <= 0) return;

    const timer = setTimeout(() => setOpen(false), msUntilKickoff);
    return () => clearTimeout(timer);
  }, [
    match.kickoff_at,
    match.status,
    match.odd_home,
    match.odd_draw,
    match.odd_away,
  ]);

  return open;
}

export function isClassicBettingOpen(match: MatchWithTeams): boolean {
  if (match.status !== "scheduled") return false;
  if (!match.odd_home || !match.odd_draw || !match.odd_away) return false;
  return !hasKickoffStarted(match.kickoff_at);
}
