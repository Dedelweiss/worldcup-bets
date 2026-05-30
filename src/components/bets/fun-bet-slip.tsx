"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { placeFunBetAction } from "@/app/(app)/matches/fun-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatOdd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FunMarket, FunOutcome } from "@/types/database";

interface FunBetSlipProps {
  market: FunMarket;
  balance: number;
}

export function FunBetSlip({ market, balance }: FunBetSlipProps) {
  const router = useRouter();
  const open = market.status === "open";
  const [outcome, setOutcome] = useState<FunOutcome | null>(null);
  const [stake, setStake] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const odd = outcome === "yes" ? market.odd_yes : outcome === "no" ? market.odd_no : null;
  const stakeNum = parseFloat(stake) || 0;
  const payout = odd && stakeNum > 0 ? Math.round(stakeNum * odd * 100) / 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) return;
    setLoading(true);
    setError(null);
    const result = await placeFunBetAction(
      market.id,
      market.match_id,
      outcome,
      stakeNum,
    );
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setExpanded(false);
    setOutcome(null);
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
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-2 p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Paris fun
            </Badge>
            {open ? (
              <Badge className="text-[10px]">Ouvert</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Fermé
              </Badge>
            )}
          </div>
          <p className="mt-2 font-medium">{market.question}</p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Oui {formatOdd(market.odd_yes)} · Non {formatOdd(market.odd_no)}
          </p>
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
                      "rounded-lg border py-2 text-sm transition-colors",
                      outcome === o.key
                        ? "border-primary bg-primary/15"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {o.label}{" "}
                    <span className="font-bold text-primary tabular-nums">
                      {formatOdd(o.odd)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`stake-${market.id}`}>Mise (€)</Label>
                <Input
                  id={`stake-${market.id}`}
                  type="number"
                  min={1}
                  max={balance}
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </div>
              {outcome && stakeNum > 0 && (
                <p className="text-sm text-muted-foreground">
                  Gain potentiel :{" "}
                  <span className="font-semibold text-primary">
                    {formatCurrency(payout)}
                  </span>
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !outcome || stakeNum < 1}
              >
                {loading ? "…" : "Parier"}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {expanded && !open && (
        <p className="border-t border-border p-4 text-sm text-muted-foreground">
          Paris fermé — en attente de clôture admin.
        </p>
      )}
    </motion.div>
  );
}
