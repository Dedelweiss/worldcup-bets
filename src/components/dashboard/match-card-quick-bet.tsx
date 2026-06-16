"use client";

import { useState } from "react";
import { MatchCardQuickExactScorePick } from "@/components/dashboard/match-card-quick-exact-score-pick";
import { MatchCardQuickResultPick } from "@/components/dashboard/match-card-quick-result-pick";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

type QuickBetTab = "result" | "exact";

interface MatchCardQuickBetProps {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
  bettingOpen: boolean;
}

export function MatchCardQuickBet({
  match,
  betStatus,
  bettingOpen,
}: MatchCardQuickBetProps) {
  const [tab, setTab] = useState<QuickBetTab>(() =>
    betStatus?.hasExactScore ? "exact" : "result",
  );

  if (
    !bettingOpen ||
    !match.odd_home ||
    !match.odd_draw ||
    !match.odd_away
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div
        className="flex rounded-lg border border-border bg-muted/20 p-0.5"
        role="tablist"
        aria-label="Type de pronostic rapide"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "result"}
          onClick={() => setTab("result")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
            tab === "result"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Résultat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "exact"}
          onClick={() => setTab("exact")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
            tab === "exact"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Score exact
        </button>
      </div>

      {tab === "result" ? (
        <MatchCardQuickResultPick
          match={match}
          betStatus={betStatus}
          bettingOpen={bettingOpen}
        />
      ) : (
        <MatchCardQuickExactScorePick
          match={match}
          betStatus={betStatus}
          bettingOpen={bettingOpen}
        />
      )}
    </div>
  );
}
