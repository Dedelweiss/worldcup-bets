"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
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

export function FunBetSlip({
  market,
  isGoldenMatch = false,
  userBet = null,
}: FunBetSlipProps) {
  const router = useRouter();
  const open = market.status === "open";
  const locked = userBet != null;

  const [outcome, setOutcome] = useState<FunOutcome | null>(
    () => userBet?.outcome ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(() => locked && open);

  const activeOutcome = locked ? userBet!.outcome : outcome;

  const odd =
    activeOutcome === "yes"
      ? market.odd_yes
      : activeOutcome === "no"
        ? market.odd_no
        : null;

  const displayOdd = locked ? userBet!.odd_at_placement : odd;
  const pointsIfWin = useMemo(() => {
    if (locked) {
      return goldenMatchPoints(userBet!.potential_payout, isGoldenMatch);
    }
    return odd != null ? goldenMatchPoints(pointsFromOdd(odd), isGoldenMatch) : 0;
  }, [locked, userBet, odd, isGoldenMatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || !outcome) return;
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
    setExpanded(false);
    router.refresh();
    setLoading(false);
  }

  if (market.status === "settled") {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="font-medium">{market.question}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clôturé — résultat :{" "}
          <span className="text-primary">
            {market.winning_outcome === "yes" ? "Oui" : "Non"}
          </span>
        </p>
        {locked && (
          <p className="mt-2 text-sm">
            Votre pronostic :{" "}
            <strong>{userBet.outcome === "yes" ? "Oui" : "Non"}</strong>
            {userBet.status === "won" && (
              <span className="text-primary"> · Gagné</span>
            )}
            {userBet.status === "lost" && (
              <span className="text-destructive"> · Perdu</span>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-start justify-between gap-2 p-4 text-left"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Paris fun
            </Badge>
            {locked && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Lock className="size-3" aria-hidden />
                Enregistré
              </Badge>
            )}
            {open ? (
              <Badge className="text-[10px]">Ouvert</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Fermé
              </Badge>
            )}
          </div>
          <p className="mt-2 font-medium">{market.question}</p>
          {locked ? (
            <p className="mt-1 text-sm text-primary">
              Votre choix :{" "}
              <strong>{userBet!.outcome === "yes" ? "Oui" : "Non"}</strong>
              {" · "}
              cote {formatOdd(userBet!.odd_at_placement)} (+{formatPoints(pointsIfWin)}{" "}
              pts si gagné)
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Oui {formatOdd(market.odd_yes)} (+{formatPoints(pointsFromOdd(market.odd_yes))}{" "}
              pts) · Non {formatOdd(market.odd_no)} (+{formatPoints(pointsFromOdd(market.odd_no))}{" "}
              pts)
            </p>
          )}
        </div>
        <span className="text-muted-foreground">{expanded ? "−" : "+"}</span>
      </button>

      <AnimatePresence>
        {expanded && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border"
          >
            {locked ? (
              <div className="space-y-4 p-4">
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <Lock className="size-4 shrink-0" aria-hidden />
                  <span>Pronostic fun enregistré — non modifiable</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "yes" as const, label: "Oui", odd: market.odd_yes },
                      { key: "no" as const, label: "Non", odd: market.odd_no },
                    ] as const
                  ).map((o) => {
                    const isChosen = activeOutcome === o.key;
                    return (
                      <div
                        key={o.key}
                        className={cn(
                          "rounded-lg border py-2 text-center text-sm",
                          isChosen
                            ? "border-primary bg-primary/15 ring-2 ring-primary"
                            : "border-border/50 bg-muted/10 opacity-40",
                        )}
                      >
                        {o.label}{" "}
                        <span className="font-bold text-primary tabular-nums">
                          {formatOdd(isChosen ? displayOdd! : o.odd)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Button type="button" className="w-full" disabled>
                  <Lock className="mr-2 size-4" aria-hidden />
                  Pronostic verrouillé
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "yes" as const, label: "Oui", odd: market.odd_yes },
                      { key: "no" as const, label: "Non", odd: market.odd_no },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setOutcome(o.key)}
                      className={cn(
                        "cursor-pointer rounded-lg border py-2 text-sm transition-colors",
                        outcome === o.key
                          ? "border-primary bg-primary/15"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {o.label}{" "}
                      <span className="font-bold text-primary tabular-nums">
                        {formatOdd(o.odd)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        +{formatPoints(pointsFromOdd(o.odd))} pts
                      </span>
                    </button>
                  ))}
                </div>
                {outcome && (
                  <p className="text-sm text-muted-foreground">
                    Points si gagné :{" "}
                    <span className="font-semibold text-primary">
                      +{formatPoints(pointsIfWin)}
                    </span>
                  </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !outcome}
                >
                  {loading ? "…" : "Valider mon pronostic"}
                </Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {expanded && !open && (
        <div className="space-y-3 border-t border-border p-4">
          {locked ? (
            <p className="text-sm">
              Votre pronostic :{" "}
              <strong>{userBet!.outcome === "yes" ? "Oui" : "Non"}</strong>
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Paris fermé — en attente de clôture admin.
          </p>
        </div>
      )}
    </motion.div>
  );
}
