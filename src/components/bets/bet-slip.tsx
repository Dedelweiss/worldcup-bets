"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Target, Zap } from "lucide-react";
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
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { goldenMatchCardClass, goldenMatchPoints } from "@/lib/golden-match";
import { betDisplayPayout, pointsFromOdd, pointsIfWin } from "@/lib/points";
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
  pending = {
    hasMatchResult: false,
    hasExactScore: false,
    matchResult: null,
    exactScore: null,
  },
}: BetSlipProps) {
  const router = useRouter();
  const bettingOpen = useClassicBettingOpen(match);

  const [mode, setMode] = useState<BetMode>(() =>
    pending.hasMatchResult ? "1n2" : pending.hasExactScore ? "exact" : "1n2",
  );
  const [selection, setSelection] = useState<MatchResultSelection | null>(
    () => pending.matchResult?.selection ?? null,
  );
  const [homeScore, setHomeScore] = useState(() =>
    pending.exactScore != null ? String(pending.exactScore.home) : "",
  );
  const [awayScore, setAwayScore] = useState(() =>
    pending.exactScore != null ? String(pending.exactScore.away) : "",
  );
  const [useBoost, setUseBoost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"1n2" | "exact" | null>(null);

  const canUseBoost = boostsAvailable > 0;
  const isGolden = match.is_golden ?? false;

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
    selectedOdd != null ? pointsIfWin(selectedOdd, boosted, isGolden) : 0;
  const basePointsIfWin =
    selectedOdd != null ? pointsFromOdd(selectedOdd) : 0;

  const parsedScore = parseScoreInputs(homeScore, awayScore);
  const impliedWinner = parsedScore
    ? impliedMatchResult(parsedScore.home, parsedScore.away)
    : null;

  const impliedOdd =
    impliedWinner != null ? impliedOddFromMatch(match, impliedWinner) : null;

  const tendancePts =
    impliedOdd != null
      ? goldenMatchPoints(exactScorePointsTendance(impliedOdd), isGolden)
      : null;
  const perfectPts =
    impliedOdd != null
      ? goldenMatchPoints(exactScorePointsPerfect(impliedOdd), isGolden)
      : null;

  const locked1n2 = pending.matchResult;
  const lockedExact = pending.exactScore;
  const active1n2Selection = locked1n2?.selection ?? selection;
  const displayHomeScore = lockedExact
    ? String(lockedExact.home)
    : homeScore;
  const displayAwayScore = lockedExact
    ? String(lockedExact.away)
    : awayScore;
  const lockedExactParsed = lockedExact
    ? { home: lockedExact.home, away: lockedExact.away }
    : parsedScore;
  const lockedImpliedWinner = lockedExactParsed
    ? impliedMatchResult(lockedExactParsed.home, lockedExactParsed.away)
    : impliedWinner;
  const lockedImpliedOdd =
    lockedImpliedWinner != null
      ? impliedOddFromMatch(match, lockedImpliedWinner)
      : impliedOdd;
  const lockedTendancePts =
    lockedImpliedOdd != null
      ? goldenMatchPoints(
          exactScorePointsTendance(lockedImpliedOdd),
          isGolden,
        )
      : null;
  const lockedPerfectPts =
    lockedImpliedOdd != null
      ? goldenMatchPoints(
          exactScorePointsPerfect(lockedImpliedOdd),
          isGolden,
        )
      : null;
  const locked1n2Points =
    locked1n2 != null
      ? betDisplayPayout(
          locked1n2.potential_payout,
          locked1n2.is_boosted,
          isGolden,
        )
      : null;

  const hasClassicBet = pending.hasMatchResult || pending.hasExactScore;

  function switchMode(next: BetMode) {
    if (pending.hasMatchResult && next === "exact") return;
    if (pending.hasExactScore && next === "1n2") return;
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
    if (pending.hasExactScore) {
      setError(
        "Vous avez déjà un score exact sur ce match. Un seul pronostic classique est autorisé.",
      );
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
    if (pending.hasMatchResult) {
      setError(
        "Vous avez déjà un pronostic 1N2 sur ce match. Un seul pronostic classique est autorisé.",
      );
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

  if (!bettingOpen && !hasClassicBet) {
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
          <Card className={cn(goldenMatchCardClass(isGolden))}>
            <CardHeader className="space-y-3">
              {isGolden && (
                <div className="flex justify-center">
                  <GoldenMatchBadge />
                </div>
              )}
              <div>
                <CardTitle className="text-base">Mon pronostic</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasClassicBet
                    ? "Votre pronostic classique pour ce match."
                    : "Un seul choix par match : 1N2 rapide ou score exact."}{" "}
                  Vos points :{" "}
                  <span className="font-semibold text-primary tabular-nums">
                    {formatPoints(points)}
                  </span>
                </p>
              </div>

              {!hasClassicBet && (
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
              )}
            </CardHeader>

            <CardContent>
              {mode === "1n2" ? (
                <form onSubmit={handleSubmit1n2} className="space-y-5">
                  {!bettingOpen && !pending.hasMatchResult && (
                    <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      Coup d&apos;envoi passé — plus de pari 1N2 possible sur ce
                      match.
                    </p>
                  )}

                  {pending.hasMatchResult && locked1n2 && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <Lock className="size-4 shrink-0" aria-hidden />
                      <span>Pronostic 1N2 enregistré — non modifiable</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>
                      {pending.hasMatchResult
                        ? "Votre pronostic 1N2"
                        : "Qui gagne selon vous ?"}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {outcomes.map((outcome) => {
                        const base = pointsFromOdd(outcome.odd!);
                        const display = goldenMatchPoints(
                          boosted ? base * 2 : base,
                          isGolden,
                        );
                        const isChosen = active1n2Selection === outcome.key;
                        return (
                          <button
                            key={outcome.key}
                            type="button"
                            disabled={pending.hasMatchResult || !bettingOpen}
                            onClick={() => setSelection(outcome.key)}
                            className={cn(
                              "flex flex-col items-center rounded-lg border py-3 transition-colors",
                              pending.hasMatchResult &&
                                "cursor-default disabled:opacity-100",
                              !pending.hasMatchResult && "disabled:opacity-50",
                              isChosen
                                ? "border-primary bg-primary/15 ring-2 ring-primary"
                                : pending.hasMatchResult
                                  ? "border-border/50 bg-muted/10 opacity-40"
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

                  {pending.hasMatchResult && locked1n2 && locked1n2Points != null && (
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Cote figée</span>
                        <span className="font-medium tabular-nums">
                          {formatOdd(locked1n2.odd_at_placement)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">Si gagné</span>
                        <span className="font-bold tabular-nums text-primary">
                          +{formatPoints(locked1n2Points)} pts
                        </span>
                      </div>
                      {locked1n2.is_boosted && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                        >
                          Boost x2 actif
                        </Badge>
                      )}
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

                  {pending.hasMatchResult ? (
                    <Button type="button" className="w-full" disabled>
                      <Lock className="mr-2 size-4" aria-hidden />
                      Pronostic 1N2 verrouillé
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || !selection || !bettingOpen}
                    >
                      {loading ? "Validation…" : "Valider le 1N2"}
                    </Button>
                  )}
                </form>
              ) : (
                <form onSubmit={handleSubmitExact} className="space-y-5">
                  {!bettingOpen && !pending.hasExactScore && (
                    <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      Coup d&apos;envoi passé — plus de score exact possible sur ce
                      match.
                    </p>
                  )}

                  {pending.hasExactScore && lockedExact && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                      <Lock className="size-4 shrink-0" aria-hidden />
                      <span>Score exact enregistré — non modifiable</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>
                      {pending.hasExactScore
                        ? "Votre score exact"
                        : "Score final prédit"}
                    </Label>
                    {!pending.hasExactScore && (
                      <p className="text-xs text-muted-foreground">
                        Utilisez +/− ou un raccourci — le vainqueur est calculé
                        automatiquement.
                      </p>
                    )}
                    <ScorePicker
                      homeTeam={match.home_team}
                      awayTeam={match.away_team}
                      homeScore={displayHomeScore}
                      awayScore={displayAwayScore}
                      disabled={pending.hasExactScore || !bettingOpen}
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

                  {((pending.hasExactScore && lockedExactParsed) ||
                    (parsedScore && !pending.hasExactScore)) &&
                    lockedImpliedOdd != null &&
                    lockedTendancePts != null &&
                    lockedPerfectPts != null && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <Target className="size-4 shrink-0 text-primary" />
                        <span>
                          Vainqueur selon votre score :{" "}
                          <strong>
                            {matchResultLabel(
                              lockedImpliedWinner!,
                              match.home_team.name,
                              match.away_team.name,
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {outcomes.map((outcome) => {
                          const active = lockedImpliedWinner === outcome.key;
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
                              lockedExactParsed!.home,
                              lockedExactParsed!.away,
                            )}
                          </strong>
                          {" · "}
                          cote {lockedImpliedOdd.toFixed(2)} (1N2 équivalent)
                        </p>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Tendance : +{formatPoints(lockedTendancePts)} pts
                            {isGolden ? " (×2 Golden)" : " (= 1N2)"}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            Tout pile : +{formatPoints(lockedPerfectPts)} pts
                            {lockedPerfectPts > lockedTendancePts &&
                              ` (×${Math.round(lockedPerfectPts / lockedTendancePts)})`}
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

                  {pending.hasExactScore ? (
                    <Button type="button" variant="secondary" className="w-full" disabled>
                      <Lock className="mr-2 size-4" aria-hidden />
                      Score exact verrouillé
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full"
                      disabled={
                        loading || !parsedScore || impliedOdd == null || !bettingOpen
                      }
                    >
                      {loading ? "Validation…" : "Valider le score exact"}
                    </Button>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
