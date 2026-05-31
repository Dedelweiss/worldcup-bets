"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Zap } from "lucide-react";
import {
  placeBetAction,
  placeExactScoreBetAction,
} from "@/app/(app)/matches/actions";
import { useClassicBettingOpen } from "@/hooks/use-match-betting-open";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScorePicker } from "@/components/bets/score-picker";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  exactScorePointsPerfect,
  exactScorePointsTendance,
  formatExactScoreSelection,
  impliedMatchResult,
  impliedOddFromMatch,
  matchResultLabel,
  parseScoreInputs,
} from "@/lib/exact-score";
import { formatOdd, formatPoints } from "@/lib/format";
import type { MatchUserPendingBets } from "@/lib/bets/match-user-bets";
import { pointsFromOdd, pointsIfWin } from "@/lib/points";
import { cn } from "@/lib/utils";
import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

type BetMode = "1n2" | "exact";

interface BetSlipProps {
  match: MatchWithTeams;
  points: number;
  boostsAvailable: number;
  pending?: MatchUserPendingBets;
}

export function BetSlip({
  match,
  points,
  boostsAvailable,
  pending = { hasMatchResult: false, hasExactScore: false },
}: BetSlipProps) {
  const router = useRouter();
  const bettingOpen = useClassicBettingOpen(match);

  const [mode, setMode] = useState<BetMode>("1n2");
  const [selection, setSelection] = useState<MatchResultSelection | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [useBoost, setUseBoost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"1n2" | "exact" | null>(null);

  const canUseBoost = boostsAvailable > 0;

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

  const boosted = useBoost && canUseBoost && mode === "1n2";
  const pointsIfWinValue =
    selectedOdd != null ? pointsIfWin(selectedOdd, boosted) : 0;
  const basePointsIfWin =
    selectedOdd != null ? pointsFromOdd(selectedOdd) : 0;

  const parsedScore = parseScoreInputs(homeScore, awayScore);
  const impliedWinner = parsedScore
    ? impliedMatchResult(parsedScore.home, parsedScore.away)
    : null;

  const impliedOdd =
    impliedWinner != null ? impliedOddFromMatch(match, impliedWinner) : null;

  const tendancePts =
    impliedOdd != null ? exactScorePointsTendance(impliedOdd) : null;
  const perfectPts =
    impliedOdd != null ? exactScorePointsPerfect(impliedOdd) : null;

  function switchMode(next: BetMode) {
    setMode(next);
    setError(null);
    if (next === "1n2") {
      setHomeScore("");
      setAwayScore("");
    } else {
      setSelection(null);
      setUseBoost(false);
    }
  }

  async function handleSubmit1n2(e: React.FormEvent) {
    e.preventDefault();
    if (!selection) {
      setError("Choisissez 1, N ou 2.");
      return;
    }
    if (pending.hasMatchResult) {
      setError("Vous avez déjà un pronostic 1N2 sur ce match.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await placeBetAction(match.id, selection, boosted);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess("1n2");
    router.refresh();
  }

  async function handleSubmitExact(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedScore) {
      setError("Saisissez un score valide pour chaque équipe (0 à 20).");
      return;
    }
    if (pending.hasExactScore) {
      setError("Vous avez déjà un score exact sur ce match.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await placeExactScoreBetAction(
      match.id,
      parsedScore.home,
      parsedScore.away,
    );
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess("exact");
    router.refresh();
  }

  if (!bettingOpen) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="font-medium">Paris classiques fermés</p>
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
        >
          <Card
            className={cn(
              "border-primary/40",
              success === "exact" && "border-emerald-500/40",
            )}
          >
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-lg font-semibold text-primary">
                {success === "1n2"
                  ? "Pronostic 1N2 enregistré"
                  : "Score exact enregistré"}
              </p>
              <p className="text-sm text-muted-foreground">
                {success === "1n2" ? (
                  <>
                    Si vous avez raison : +{formatPoints(pointsIfWinValue)} points
                    {boosted && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Boost x2
                      </Badge>
                    )}
                  </>
                ) : tendancePts != null && perfectPts != null ? (
                  <>
                    Tendance +{formatPoints(tendancePts)} pts · Tout pile +
                    {formatPoints(perfectPts)} pts
                  </>
                ) : null}
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
        >
          <Card>
            <CardHeader className="space-y-3">
              <div>
                <CardTitle className="text-base">Mon pronostic</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez un mode — un pari par type et par match. Vos points :{" "}
                  <span className="font-semibold text-primary tabular-nums">
                    {formatPoints(points)}
                  </span>
                </p>
              </div>

              <div
                className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                role="tablist"
                aria-label="Type de pari"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "1n2"}
                  onClick={() => switchMode("1n2")}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === "1n2"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  1N2 rapide
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "exact"}
                  onClick={() => switchMode("exact")}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === "exact"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Score exact
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {mode === "1n2" ? (
                <form onSubmit={handleSubmit1n2} className="space-y-5">
                  {pending.hasMatchResult && (
                    <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                      Pronostic 1N2 déjà enregistré sur ce match. Vous pouvez encore
                      jouer un score exact via l&apos;onglet dédié.
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Qui gagne selon vous ?</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {outcomes.map((outcome) => {
                        const base = pointsFromOdd(outcome.odd!);
                        const display = boosted ? base * 2 : base;
                        return (
                          <button
                            key={outcome.key}
                            type="button"
                            disabled={pending.hasMatchResult}
                            onClick={() => setSelection(outcome.key)}
                            className={cn(
                              "flex flex-col items-center rounded-lg border py-3 transition-colors disabled:opacity-50",
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
                              +{formatPoints(display)} pts
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {canUseBoost && !pending.hasMatchResult && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <Zap className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <div>
                          <Label
                            htmlFor="boost-switch"
                            className="cursor-pointer font-medium"
                          >
                            Boost x2
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Un seul joker pour le tournoi
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="boost-switch"
                        checked={useBoost}
                        onCheckedChange={setUseBoost}
                        disabled={!selection}
                      />
                    </div>
                  )}

                  {selection && !pending.hasMatchResult && (
                    <div className="rounded-lg bg-muted/40 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Si gagné</span>
                        <span className="font-bold tabular-nums text-primary">
                          +{formatPoints(pointsIfWinValue)}
                        </span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !selection || pending.hasMatchResult}
                  >
                    {loading ? "Validation…" : "Valider le 1N2"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmitExact} className="space-y-5">
                  {pending.hasExactScore && (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                      Score exact déjà enregistré. Vous pouvez encore jouer le 1N2
                      via l&apos;onglet « 1N2 rapide ».
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Score final prédit</Label>
                    <p className="text-xs text-muted-foreground">
                      Utilisez +/− ou un raccourci — le vainqueur est calculé
                      automatiquement.
                    </p>
                    <ScorePicker
                      homeTeam={match.home_team}
                      awayTeam={match.away_team}
                      homeScore={homeScore}
                      awayScore={awayScore}
                      disabled={pending.hasExactScore}
                      onHomeChange={(v) => {
                        setHomeScore(v);
                        setError(null);
                      }}
                      onAwayChange={(v) => {
                        setAwayScore(v);
                        setError(null);
                      }}
                    />
                  </div>

                  {parsedScore && impliedOdd == null && (
                    <p className="text-sm text-destructive">
                      Cotes indisponibles pour ce résultat. Contactez l&apos;admin.
                    </p>
                  )}

                  {parsedScore && impliedOdd != null && tendancePts != null && perfectPts != null && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <Target className="size-4 shrink-0 text-primary" />
                        <span>
                          Vainqueur selon votre score :{" "}
                          <strong>
                            {matchResultLabel(
                              impliedWinner!,
                              match.home_team.name,
                              match.away_team.name,
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {outcomes.map((outcome) => {
                          const active = impliedWinner === outcome.key;
                          return (
                            <div
                              key={outcome.key}
                              className={cn(
                                "flex flex-col items-center rounded-lg border py-2.5 text-center transition-colors",
                                active
                                  ? "border-primary bg-primary/15 ring-1 ring-primary"
                                  : "border-border/50 bg-muted/10 opacity-40",
                              )}
                              aria-hidden
                            >
                              <span className="text-[10px] font-medium">
                                {outcome.label}
                              </span>
                              <span className="mt-0.5 line-clamp-2 px-1 text-[10px] leading-tight">
                                {outcome.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                        <p>
                          Score{" "}
                          <strong className="text-foreground">
                            {formatExactScoreSelection(
                              parsedScore.home,
                              parsedScore.away,
                            )}
                          </strong>
                          {" · "}
                          cote {impliedOdd.toFixed(2)} (1N2 équivalent)
                        </p>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Tendance : +{formatPoints(tendancePts)} pts (= 1N2)
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            Tout pile : +{formatPoints(perfectPts)} pts
                            {perfectPts > tendancePts &&
                              ` (×${Math.round(perfectPts / tendancePts)})`}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    disabled={
                      loading ||
                      !parsedScore ||
                      impliedOdd == null ||
                      pending.hasExactScore
                    }
                  >
                    {loading ? "Validation…" : "Valider le score exact"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
