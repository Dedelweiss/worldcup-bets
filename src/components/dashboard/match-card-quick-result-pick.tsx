"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { placeBetAction } from "@/app/(app)/matches/actions";
import {
  MATCH_RESULT_OUTCOME,
} from "@/lib/bets/match-result-copy";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { formatOdd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

interface MatchCardQuickResultPickProps {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
  bettingOpen: boolean;
}

export function MatchCardQuickResultPick({
  match,
  betStatus,
  bettingOpen,
}: MatchCardQuickResultPickProps) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<MatchResultSelection | null>(
    null,
  );
  const [selected, setSelected] = useState<MatchResultSelection | null>(
    betStatus?.matchResultSelection ?? null,
  );

  useEffect(() => {
    setSelected(betStatus?.matchResultSelection ?? null);
  }, [betStatus?.matchResultSelection]);

  const hasExactScore = betStatus?.hasExactScore ?? false;

  if (
    !bettingOpen ||
    hasExactScore ||
    !match.odd_home ||
    !match.odd_draw ||
    !match.odd_away
  ) {
    return null;
  }

  const outcomes = [
    { key: "home" as const, label: MATCH_RESULT_OUTCOME.home, odd: match.odd_home },
    { key: "draw" as const, label: MATCH_RESULT_OUTCOME.draw, odd: match.odd_draw },
    { key: "away" as const, label: MATCH_RESULT_OUTCOME.away, odd: match.odd_away },
  ];

  async function handlePick(key: MatchResultSelection) {
    if (loadingKey) return;

    if (selected === key && betStatus?.hasMatchResult) {
      toast.message("Ce pronostic est déjà enregistré.");
      return;
    }

    setLoadingKey(key);
    const result = await placeBetAction(match.id, key);
    setLoadingKey(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setSelected(key);
    const label = outcomes.find((o) => o.key === key)?.label ?? key;
    toast.success(
      betStatus?.hasMatchResult
        ? `Pronostic mis à jour : ${label}`
        : `Pronostic enregistré : ${label}`,
    );
    router.refresh();
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {outcomes.map((outcome) => {
        const isSelected = selected === outcome.key;
        const isLoading = loadingKey === outcome.key;

        return (
          <button
            key={outcome.key}
            type="button"
            disabled={loadingKey != null}
            onClick={() => void handlePick(outcome.key)}
            className={cn(
              "flex cursor-pointer flex-col items-center rounded-lg border py-2 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50",
              isSelected
                ? "border-lime-400/60 bg-lime-400/15 ring-1 ring-lime-400/40"
                : "border-border bg-muted/20 hover:border-lime-400/45 hover:bg-lime-400/10 hover:ring-1 hover:ring-lime-400/25",
              loadingKey != null && !isLoading && "opacity-60",
            )}
            title={
              isSelected
                ? `Votre pronostic : ${outcome.label.toLowerCase()}`
                : `Parier ${outcome.label.toLowerCase()}`
            }
          >
            <span className="text-[10px] font-medium text-muted-foreground">
              {outcome.label}
            </span>
            <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-primary">
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                formatOdd(outcome.odd)
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
