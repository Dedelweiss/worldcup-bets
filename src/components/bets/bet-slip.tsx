"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { placeBetAction } from "@/app/(app)/matches/actions";
import { useClassicBettingOpen } from "@/hooks/use-match-betting-open";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOdd, formatPoints } from "@/lib/format";
import { pointsFromOdd } from "@/lib/points";
import { cn } from "@/lib/utils";
import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

interface BetSlipProps {
  match: MatchWithTeams;
  points: number;
}

export function BetSlip({ match, points }: BetSlipProps) {
  const router = useRouter();
  const bettingOpen = useClassicBettingOpen(match);
  const [selection, setSelection] = useState<MatchResultSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const outcomes = useMemo(
    () =>
      [
        {
          key: "home" as const,
          label: "1",
          name: match.home_team.name,
          odd: match.odd_home,
        },
        {
          key: "draw" as const,
          label: "N",
          name: "Match nul",
          odd: match.odd_draw,
        },
        {
          key: "away" as const,
          label: "2",
          name: match.away_team.name,
          odd: match.odd_away,
        },
      ].filter((o) => o.odd != null),
    [match],
  );

  const selectedOdd =
    selection === "home"
      ? match.odd_home
      : selection === "draw"
        ? match.odd_draw
        : selection === "away"
          ? match.odd_away
          : null;

  const pointsIfWin =
    selectedOdd != null ? pointsFromOdd(selectedOdd) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bettingOpen) {
      setError("Les paris classiques sont fermés (match commencé).");
      return;
    }
    if (!selection) {
      setError("Choisissez un résultat (1, N ou 2).");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await placeBetAction(match.id, selection);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (!bettingOpen) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="font-medium">Paris 1N2 fermés</p>
          <p className="mt-1 text-sm">
            Le coup d&apos;envoi est passé. Consultez les paris fun ci-dessous.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <Card className="border-primary/40">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <motion.p
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-lg font-semibold text-primary"
              >
                Pari enregistré
              </motion.p>
              <p className="text-sm text-muted-foreground">
                Si vous avez raison : +{formatPoints(pointsIfWin)} points
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/bets")}>
                  Mes paris
                </Button>
                <Button onClick={() => router.push("/dashboard")}>
                  Tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paris classique (1N2)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vos points :{" "}
                <span className="font-semibold text-primary tabular-nums">
                  {formatPoints(points)}
                </span>
                {" · "}
                Pas de mise — gain selon la cote si bon pronostic
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Résultat</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {outcomes.map((outcome) => (
                      <motion.button
                        key={outcome.key}
                        type="button"
                        layout
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelection(outcome.key)}
                        className={cn(
                          "flex flex-col items-center rounded-lg border py-3 transition-colors",
                          selection === outcome.key
                            ? "border-primary bg-primary/15 ring-1 ring-primary"
                            : "border-border bg-muted/20 hover:border-primary/50",
                        )}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {outcome.label}
                        </span>
                        <span className="mt-0.5 max-w-full truncate px-1 text-xs font-medium">
                          {outcome.name}
                        </span>
                        <span className="mt-1 text-sm font-bold tabular-nums text-primary">
                          {formatOdd(outcome.odd!)}
                        </span>
                        <span className="mt-0.5 text-[10px] text-muted-foreground">
                          +{formatPoints(pointsFromOdd(outcome.odd!))} pts
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {selection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-lg bg-muted/40 p-3 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Points si gagné
                        </span>
                        <span className="font-bold tabular-nums text-primary">
                          +{formatPoints(pointsIfWin)}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !selection}
                >
                  {loading ? "Validation…" : "Valider mon pronostic"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
