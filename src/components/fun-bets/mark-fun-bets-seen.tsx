"use client";

import { useEffect } from "react";
import { useFunBetsNotificationsContext } from "@/components/fun-bets/fun-bets-notifications-context";

/** Marque les paris fun d'un match comme vus (badge + localStorage). */
export function MarkFunBetsSeen({ matchId }: { matchId: number }) {
  const { markMatchSeen } = useFunBetsNotificationsContext();

  useEffect(() => {
    markMatchSeen(matchId);
  }, [matchId, markMatchSeen]);

  return null;
}
