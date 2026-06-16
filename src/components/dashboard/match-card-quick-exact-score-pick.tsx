"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { placeExactScoreBetAction } from "@/app/(app)/matches/actions";
import { QUICK_SCORES } from "@/components/bets/score-picker";
import { formatExactScoreSelection } from "@/lib/exact-score";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

interface MatchCardQuickExactScorePickProps {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
  bettingOpen: boolean;
}

function scoreKey(home: number, away: number) {
  return `${home}-${away}`;
}

export function MatchCardQuickExactScorePick({
  match,
  betStatus,
  bettingOpen,
}: MatchCardQuickExactScorePickProps) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [selected, setSelected] = useState(
    () => betStatus?.exactScore ?? null,
  );

  useEffect(() => {
    setSelected(betStatus?.exactScore ?? null);
  }, [betStatus?.exactScore]);

  if (!bettingOpen) return null;

  async function handlePick(home: number, away: number) {
    const key = scoreKey(home, away);
    if (loadingKey) return;

    if (
      selected?.home === home &&
      selected?.away === away &&
      betStatus?.hasExactScore
    ) {
      toast.message("Ce score est déjà enregistré.");
      return;
    }

    setLoadingKey(key);
    const result = await placeExactScoreBetAction(match.id, home, away);
    setLoadingKey(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setSelected({ home, away });
    const label = formatExactScoreSelection(home, away);
    toast.success(
      betStatus?.hasExactScore
        ? `Score mis à jour : ${label}`
        : `Score exact enregistré : ${label}`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {QUICK_SCORES.map((score) => {
          const key = scoreKey(score.home, score.away);
          const isSelected =
            selected?.home === score.home && selected?.away === score.away;
          const isLoading = loadingKey === key;

          return (
            <button
              key={score.label}
              type="button"
              disabled={loadingKey != null}
              onClick={() => void handlePick(score.home, score.away)}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border py-2 font-mono text-sm font-semibold tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                isSelected
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-950 ring-1 ring-amber-400/40 dark:text-amber-100"
                  : "border-border bg-muted/20 text-foreground hover:border-amber-400/45 hover:bg-amber-400/10",
                loadingKey != null && !isLoading && "opacity-60",
              )}
              title={
                isSelected
                  ? `Votre score : ${score.label}`
                  : `Parier sur ${score.label}`
              }
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                score.label
              )}
            </button>
          );
        })}
      </div>
      <Link
        href={`/matches/${match.id}#mon-pronostic`}
        className="flex items-center justify-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"
      >
        <Target className="size-3" aria-hidden />
        Score personnalisé ou boost
      </Link>
    </div>
  );
}
