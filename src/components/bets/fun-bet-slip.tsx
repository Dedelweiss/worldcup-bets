"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, Sparkles, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { placeFunBetAction } from "@/app/(app)/matches/fun-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatOdd, formatPoints } from "@/lib/format";
import { goldenMatchPoints } from "@/lib/golden-match";
import type { MatchUserFunBet } from "@/lib/bets/match-user-fun-bets";
import { pointsFromOdd } from "@/lib/points";
import { cn } from "@/lib/utils";
import type { FunMarket, FunOutcome } from "@/types/database";

interface FunBetSlipProps {
  market: FunMarket;
  isGoldenMatch?: boolean;
  userBet?: MatchUserFunBet | null;
}

const OUTCOMES = [
  { key: "yes" as const, label: "Oui", icon: ThumbsUp },
  { key: "no" as const, label: "Non", icon: ThumbsDown },
] as const;

export function FunBetSlip({
  market,
  isGoldenMatch = false,
  userBet = null,
}: FunBetSlipProps) {
  const router = useRouter();
  const open = market.status === "open";
  const locked = userBet != null;
  const canBet = open && !locked;

  const [outcome, setOutcome] = useState<FunOutcome | null>(
    () => userBet?.outcome ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeOutcome = locked ? userBet!.outcome : outcome;

  const yesPoints = goldenMatchPoints(
    pointsFromOdd(market.odd_yes),
    isGoldenMatch,
  );
  const noPoints = goldenMatchPoints(
    pointsFromOdd(market.odd_no),
    isGoldenMatch,
  );

  const selectedPoints = useMemo(() => {
    if (locked) {
      return goldenMatchPoints(userBet!.potential_payout, isGoldenMatch);
    }
    if (outcome === "yes") return yesPoints;
    if (outcome === "no") return noPoints;
    return null;
  }, [locked, userBet, outcome, yesPoints, noPoints, isGoldenMatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canBet || !outcome) return;
    setLoading(true);
    setError(null);
    const result = await placeFunBetAction(
      market.id,
      market.match_id,
      outcome,
    );
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  if (market.status === "settled") {
    const won = userBet?.status === "won";
    const lost = userBet?.status === "lost";

    return (
      <div
        className={cn(
          "rounded-xl border bg-card/80 p-4 backdrop-blur-sm",
          won
            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
            : lost
              ? "border-border/60 bg-muted/20"
              : "border-border/60",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="text-[10px]">
            Clôturé
          </Badge>
          <span className="text-xs font-medium text-primary">
            → {market.winning_outcome === "yes" ? "Oui" : "Non"}
          </span>
        </div>
        <p className="mt-3 font-medium leading-snug">{market.question}</p>
        {locked && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              won
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : lost
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/50",
            )}
          >
            {won ? (
              <Trophy className="size-4 shrink-0" aria-hidden />
            ) : (
              <Check className="size-4 shrink-0 opacity-60" aria-hidden />
            )}
            <span>
              Votre choix :{" "}
              <strong>{userBet.outcome === "yes" ? "Oui" : "Non"}</strong>
              {won && " · Gagné"}
              {lost && " · Perdu"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.article
      layout
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/90 backdrop-blur-sm transition-shadow",
        open && canBet && "border-amber-500/30 shadow-md shadow-amber-500/5",
        open && locked && "border-primary/30",
        !open && "border-border/60 opacity-90",
      )}
    >
      {open && canBet && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
          aria-hidden
        />
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {open ? (
            <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              Ouvert
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Fermé
            </Badge>
          )}
          {locked && (
            <Badge
              variant="outline"
              className="gap-1 border-primary/30 text-[10px] text-primary"
            >
              <Check className="size-3" aria-hidden />
              Enregistré
            </Badge>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight">
          {market.question}
        </h3>

        {locked && selectedPoints != null && (
          <p className="mt-2 text-sm text-primary">
            <strong>{userBet!.outcome === "yes" ? "Oui" : "Non"}</strong>
            {" · "}
            cote {formatOdd(userBet!.odd_at_placement)} · jusqu&apos;à{" "}
            <span className="font-bold tabular-nums">
              +{formatPoints(selectedPoints)} pts
            </span>
          </p>
        )}

        {canBet && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {OUTCOMES.map(({ key, label, icon: Icon }) => {
                const odd = key === "yes" ? market.odd_yes : market.odd_no;
                const pts = key === "yes" ? yesPoints : noPoints;
                const selected = outcome === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setOutcome(key);
                      setError(null);
                    }}
                    className={cn(
                      "group relative flex flex-col items-center gap-1 rounded-xl border px-3 py-3.5 transition-all",
                      selected
                        ? key === "yes"
                          ? "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/40"
                          : "border-rose-500/50 bg-rose-500/10 ring-2 ring-rose-500/40"
                        : "border-border/70 bg-muted/20 hover:border-amber-500/30 hover:bg-amber-500/[0.04]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5 transition-colors",
                        selected
                          ? key === "yes"
                            ? "text-emerald-500"
                            : "text-rose-500"
                          : "text-muted-foreground group-hover:text-amber-500",
                      )}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-lg font-bold tabular-nums text-primary">
                      {formatOdd(odd)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      +{formatPoints(pts)} pts
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedPoints != null && outcome && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">Gain potentiel</span>
                <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  +{formatPoints(selectedPoints)} pts
                </span>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-500/90 hover:to-amber-600/90"
              disabled={loading || !outcome}
            >
              <Sparkles className="size-4" aria-hidden />
              {loading ? "Validation…" : "Valider mon pari fun"}
            </Button>
          </form>
        )}

        {open && locked && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(({ key, label }) => {
                const isChosen = activeOutcome === key;
                const odd =
                  key === "yes" ? market.odd_yes : market.odd_no;
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border py-2.5 text-center text-sm",
                      isChosen
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border/40 bg-muted/10 opacity-40",
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="mt-0.5 block font-bold tabular-nums text-primary">
                      {formatOdd(isChosen ? userBet!.odd_at_placement : odd)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
              <Lock className="size-4 shrink-0" aria-hidden />
              Pronostic enregistré — en attente du résultat
            </div>
          </div>
        )}

        {!open && !locked && (
          <p className="mt-3 text-sm text-muted-foreground">
            Paris fermé — en attente de clôture par l&apos;admin.
          </p>
        )}

        {!open && locked && (
          <p className="mt-3 text-sm text-muted-foreground">
            Votre pronostic :{" "}
            <strong className="text-foreground">
              {userBet!.outcome === "yes" ? "Oui" : "Non"}
            </strong>
          </p>
        )}
      </div>
    </motion.article>
  );
}
