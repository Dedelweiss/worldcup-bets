"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { placeExactScoreBetAction } from "@/app/(app)/matches/actions";
import { QUICK_SCORES } from "@/components/bets/score-picker";
import { Button } from "@/components/ui/button";
import { teamSlotLabel } from "@/lib/bets/match-result-copy";
import {
  formatExactScoreSelection,
  parseScoreInputs,
} from "@/lib/exact-score";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

const MAX_GOALS = 20;
const CUSTOM_LOADING_KEY = "custom";

interface MatchCardQuickExactScorePickProps {
  match: MatchWithTeams;
  betStatus?: UserMatchBetStatus;
  bettingOpen: boolean;
}

function scoreKey(home: number, away: number) {
  return `${home}-${away}`;
}

function isQuickScore(home: number, away: number) {
  return QUICK_SCORES.some((s) => s.home === home && s.away === away);
}

function CompactScoreStepper({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const current = Number.parseInt(value, 10);
  const display = Number.isNaN(current) ? "0" : String(current);

  function setScore(next: number) {
    onChange(String(Math.max(0, Math.min(MAX_GOALS, next))));
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
      <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={disabled || (!Number.isNaN(current) && current <= 0)}
          onClick={() => setScore((Number.isNaN(current) ? 0 : current) - 1)}
          aria-label={`Moins ${label}`}
        >
          <Minus className="size-3" aria-hidden />
        </Button>
        <span className="w-7 text-center font-mono text-base font-bold tabular-nums">
          {display}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={
            disabled || (!Number.isNaN(current) && current >= MAX_GOALS)
          }
          onClick={() => setScore((Number.isNaN(current) ? -1 : current) + 1)}
          aria-label={`Plus ${label}`}
        >
          <Plus className="size-3" aria-hidden />
        </Button>
      </div>
    </div>
  );
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
  const [homeInput, setHomeInput] = useState(() =>
    betStatus?.exactScore != null ? String(betStatus.exactScore.home) : "0",
  );
  const [awayInput, setAwayInput] = useState(() =>
    betStatus?.exactScore != null ? String(betStatus.exactScore.away) : "0",
  );

  useEffect(() => {
    if (betStatus?.exactScore) {
      setSelected(betStatus.exactScore);
      setHomeInput(String(betStatus.exactScore.home));
      setAwayInput(String(betStatus.exactScore.away));
    }
  }, [betStatus?.exactScore]);

  if (!bettingOpen) return null;

  const homeLabel = teamSlotLabel("home", match.home_team);
  const awayLabel = teamSlotLabel("away", match.away_team);
  const parsedCustom = parseScoreInputs(homeInput, awayInput);
  const customMatchesSelected =
    parsedCustom != null &&
    selected?.home === parsedCustom.home &&
    selected?.away === parsedCustom.away;
  const customIsActive =
    customMatchesSelected &&
    (parsedCustom == null || !isQuickScore(parsedCustom.home, parsedCustom.away));

  async function submitScore(home: number, away: number, key: string) {
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
    setHomeInput(String(home));
    setAwayInput(String(away));
    const label = formatExactScoreSelection(home, away);
    toast.success(
      betStatus?.hasExactScore
        ? `Score mis à jour : ${label}`
        : `Score exact enregistré : ${label}`,
    );
    router.refresh();
  }

  async function handleQuickPick(home: number, away: number) {
    setHomeInput(String(home));
    setAwayInput(String(away));
    await submitScore(home, away, scoreKey(home, away));
  }

  async function handleSubmitCustom() {
    const parsed = parseScoreInputs(homeInput, awayInput);
    if (!parsed) {
      toast.error("Score invalide (0 à 20 buts par équipe).");
      return;
    }
    await submitScore(parsed.home, parsed.away, CUSTOM_LOADING_KEY);
  }

  const isCustomLoading = loadingKey === CUSTOM_LOADING_KEY;

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
              onClick={() => void handleQuickPick(score.home, score.away)}
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

      <div
        className={cn(
          "rounded-lg border p-2 transition-colors",
          customIsActive || (customMatchesSelected && parsedCustom != null)
            ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/30"
            : "border-border bg-muted/20",
        )}
      >
        <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Score personnalisé
        </p>
        <div className="flex items-end gap-2">
          <CompactScoreStepper
            label={homeLabel}
            value={homeInput}
            onChange={setHomeInput}
            disabled={loadingKey != null}
          />
          <span
            className="pb-2 font-mono text-lg font-light text-muted-foreground"
            aria-hidden
          >
            -
          </span>
          <CompactScoreStepper
            label={awayLabel}
            value={awayInput}
            onChange={setAwayInput}
            disabled={loadingKey != null}
          />
          <Button
            type="button"
            size="sm"
            disabled={loadingKey != null || parsedCustom == null}
            onClick={() => void handleSubmitCustom()}
            className="mb-0.5 shrink-0"
          >
            {isCustomLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              "OK"
            )}
          </Button>
        </div>
        {parsedCustom != null && (
          <p className="mt-1.5 text-center font-mono text-xs tabular-nums text-muted-foreground">
            {formatExactScoreSelection(parsedCustom.home, parsedCustom.away)}
          </p>
        )}
      </div>

      <Link
        href={`/matches/${match.id}#mon-pronostic`}
        className="flex items-center justify-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"
      >
        <Zap className="size-3" aria-hidden />
        Boost ×2 sur la fiche match
      </Link>
    </div>
  );
}
