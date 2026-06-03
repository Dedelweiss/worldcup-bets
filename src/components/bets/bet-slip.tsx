"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import {
  buildMatchResultOutcomes,
  MATCH_RESULT_COPY,
} from "@/lib/bets/match-result-copy";
import type { MatchUserPendingBets } from "@/lib/bets/match-user-bets";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { MatchOddsSourceBadge } from "@/components/matches/match-odds-source-badge";
import { TacklePicker } from "@/components/bets/tackle-picker";
import { goldenMatchCardClass, goldenMatchPoints } from "@/lib/golden-match";
import { betDisplayPayout, pointsFromOdd, pointsIfWin } from "@/lib/points";
import type { MatchParticipationPlayer } from "@/lib/bets/match-participation";
import type { MatchTackleState } from "@/lib/bets/match-tackle-utils";
import { tackleEligibleRivals } from "@/lib/bets/match-tackle-utils";
import { cn } from "@/lib/utils";
import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

type BetMode = "1n2" | "exact";

interface BetSlipProps {
  match: MatchWithTeams;
  points: number;
  boostsAvailable: number;
  pending?: MatchUserPendingBets;
  currentUserId: string;
  participation?: MatchParticipationPlayer[];
  tackleState?: MatchTackleState;
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
  currentUserId,
  participation = [],
  tackleState,
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
  const [useBoost, setUseBoost] = useState(
    () => pending.matchResult?.is_boosted ?? false,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [classicBetConfirmed, setClassicBetConfirmed] = useState(false);

  const canUseBoost = boostsAvailable > 0;
  const isGolden = match.is_golden ?? false;

  const outcomes = useMemo(() => buildMatchResultOutcomes(match), [match]);

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
  const canEditClassic = bettingOpen;

  /** En édition, l’UI suit l’état local ; après coup d’envoi, les valeurs figées du pari. */
  const active1n2Selection = canEditClassic
    ? selection
    : (locked1n2?.selection ?? selection);
  const displayHomeScore = canEditClassic
    ? homeScore
    : lockedExact
      ? String(lockedExact.home)
      : homeScore;
  const displayAwayScore = canEditClassic
    ? awayScore
    : lockedExact
      ? String(lockedExact.away)
      : awayScore;

  const previewExactParsed = canEditClassic
    ? parsedScore
    : lockedExact
      ? { home: lockedExact.home, away: lockedExact.away }
      : parsedScore;
  const previewImpliedWinner = previewExactParsed
    ? impliedMatchResult(previewExactParsed.home, previewExactParsed.away)
    : null;
  const previewImpliedOdd =
    previewImpliedWinner != null
      ? impliedOddFromMatch(match, previewImpliedWinner)
      : null;
  const previewTendancePts =
    previewImpliedOdd != null
      ? goldenMatchPoints(
          exactScorePointsTendance(previewImpliedOdd),
          isGolden,
        )
      : null;
  const previewPerfectPts =
    previewImpliedOdd != null
      ? goldenMatchPoints(
          exactScorePointsPerfect(previewImpliedOdd),
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

  const hasClassicBet =
    pending.hasMatchResult || pending.hasExactScore || classicBetConfirmed;
  const tackleRivals = tackleEligibleRivals(participation, currentUserId);

  const has1n2Change =
    selection != null &&
    (pending.matchResult == null ||
      selection !== pending.matchResult.selection ||
      useBoost !== pending.matchResult.is_boosted);

  const hasExactChange =
    parsedScore != null &&
    (pending.exactScore == null ||
      parsedScore.home !== pending.exactScore.home ||
      parsedScore.away !== pending.exactScore.away);

  function switchMode(next: BetMode) {
    if (!canEditClassic) {
      if (pending.hasMatchResult && next === "exact") return;
      if (pending.hasExactScore && next === "1n2") return;
    }
    setMode(next);
    setSavedNotice(null);
    setError(null);

    if (next === "1n2") {
      if (pending.matchResult) {
        setSelection(pending.matchResult.selection);
        setUseBoost(pending.matchResult.is_boosted);
      } else if (!pending.hasExactScore) {
        setSelection(null);
        setUseBoost(false);
      }
      if (!canEditClassic && !pending.hasExactScore) {
        setHomeScore("");
        setAwayScore("");
      }
    } else {
      const scoresEmpty = homeScore === "" && awayScore === "";
      if (scoresEmpty && pending.exactScore) {
        setHomeScore(String(pending.exactScore.home));
        setAwayScore(String(pending.exactScore.away));
      } else if (!pending.hasMatchResult && scoresEmpty) {
        setHomeScore("");
        setAwayScore("");
      }
      if (!pending.hasMatchResult) {
        setSelection(null);
        setUseBoost(false);
      }
    }
  }

  async function handleSubmit1n2(e: React.FormEvent) {
    e.preventDefault();
    if (!selection) {
      setError("Choisissez 1, N ou 2.");
      return;
    }
    if (!canEditClassic && pending.hasMatchResult) {
      setError(MATCH_RESULT_COPY.alreadyOnMatch);
      return;
    }
    if (!canEditClassic && pending.hasExactScore) {
      setError(
        "Vous avez déjà un score exact sur ce match. Un seul pronostic classique est autorisé.",
      );
      return;
    }
    if (pending.hasMatchResult && !has1n2Change) {
      setSavedNotice(MATCH_RESULT_COPY.pronosticUpdated);
      return;
    }

    setLoading(true);
    setError(null);
    setSavedNotice(null);
    const result = await placeBetAction(match.id, selection, boosted);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    if (pending.hasMatchResult) {
      setSavedNotice(MATCH_RESULT_COPY.pronosticUpdated);
      router.refresh();
      return;
    }
    setClassicBetConfirmed(true);
    setSavedNotice(MATCH_RESULT_COPY.pronosticSavedResult);
    router.refresh();
  }

  async function handleSubmitExact(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedScore) {
      setError("Saisissez un score valide pour chaque équipe (0 à 20).");
      return;
    }
    if (!canEditClassic && pending.hasExactScore) {
      setError("Vous avez déjà un score exact sur ce match.");
      return;
    }
    if (!canEditClassic && pending.hasMatchResult) {
      setError(
        `${MATCH_RESULT_COPY.alreadyOnMatch} Un seul pronostic classique est autorisé.`,
      );
      return;
    }
    if (pending.hasExactScore && !hasExactChange) {
      setSavedNotice(MATCH_RESULT_COPY.exactScoreUpdated);
      return;
    }

    setLoading(true);
    setError(null);
    setSavedNotice(null);
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
    if (pending.hasExactScore) {
      setSavedNotice(MATCH_RESULT_COPY.exactScoreUpdated);
      router.refresh();
      return;
    }
    setClassicBetConfirmed(true);
    setSavedNotice("Score exact enregistré.");
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(goldenMatchCardClass(isGolden), "overflow-visible")}>
            <CardHeader className="space-y-3">
              {isGolden && (
                <div className="flex justify-center">
                  <GoldenMatchBadge />
                </div>
              )}
              <div>
                <CardTitle className="text-base">Mon pronostic</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasClassicBet && canEditClassic
                    ? MATCH_RESULT_COPY.modifyHint
                    : hasClassicBet
                      ? "Votre pronostic classique pour ce match."
                      : MATCH_RESULT_COPY.oneChoicePerMatch}{" "}
                  Vos points :{" "}
                  <span className="font-semibold text-primary tabular-nums">
                    {formatPoints(points)}
                  </span>
                </p>
              </div>

              {(!hasClassicBet || canEditClassic) && (
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
                    {MATCH_RESULT_COPY.tabQuick}
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
                      {MATCH_RESULT_COPY.kickoffClosed}
                    </p>
                  )}

                  {pending.hasMatchResult && locked1n2 && !canEditClassic && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <Lock className="size-4 shrink-0" aria-hidden />
                      <span>
                        {MATCH_RESULT_COPY.pronosticSavedResult} — non modifiable
                      </span>
                    </div>
                  )}
                  {savedNotice && mode === "1n2" && (
                    <p className="rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-sm text-lime-300">
                      {savedNotice}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label>
                        {pending.hasMatchResult
                          ? MATCH_RESULT_COPY.yourPronostic
                          : "Qui gagne selon vous ?"}
                      </Label>
                      <MatchOddsSourceBadge match={match} className="text-[10px]" />
                    </div>
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
                            disabled={!canEditClassic}
                            onClick={() => {
                              setSelection(outcome.key);
                              setSavedNotice(null);
                            }}
                            className={cn(
                              "flex flex-col items-center rounded-lg border py-3 transition-colors",
                              !canEditClassic && "cursor-default opacity-60",
                              isChosen
                                ? "border-primary bg-primary/15 ring-2 ring-primary"
                                : !canEditClassic
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

                  {canUseBoost && canEditClassic && (
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

                  {!canEditClassic && pending.hasMatchResult ? (
                    <Button type="button" className="w-full" disabled>
                      <Lock className="mr-2 size-4" aria-hidden />
                      {MATCH_RESULT_COPY.pronosticLocked}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        loading ||
                        !selection ||
                        !bettingOpen ||
                        (pending.hasMatchResult && !has1n2Change)
                      }
                    >
                      {loading
                        ? "Validation…"
                        : pending.hasMatchResult
                          ? MATCH_RESULT_COPY.update
                          : MATCH_RESULT_COPY.validate}
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

                  {pending.hasExactScore && lockedExact && !canEditClassic && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                      <Lock className="size-4 shrink-0" aria-hidden />
                      <span>Score exact enregistré — non modifiable</span>
                    </div>
                  )}
                  {savedNotice && mode === "exact" && (
                    <p className="rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-sm text-lime-300">
                      {savedNotice}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>
                      {pending.hasExactScore
                        ? "Votre score exact"
                        : "Score final prédit"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {pending.hasExactScore && canEditClassic
                        ? "Modifiez le score avec +/− ou un raccourci."
                        : "Utilisez +/− ou un raccourci — le vainqueur est calculé automatiquement."}
                    </p>
                    <ScorePicker
                      homeTeam={match.home_team}
                      awayTeam={match.away_team}
                      homeScore={displayHomeScore}
                      awayScore={displayAwayScore}
                      disabled={!canEditClassic}
                      onHomeChange={(v) => {
                        setHomeScore(v);
                        setError(null);
                        setSavedNotice(null);
                      }}
                      onAwayChange={(v) => {
                        setAwayScore(v);
                        setError(null);
                        setSavedNotice(null);
                      }}
                    />
                  </div>

                  {parsedScore && impliedOdd == null && (
                    <p className="text-sm text-destructive">
                      Cotes indisponibles pour ce résultat. Contactez l&apos;admin.
                    </p>
                  )}

                  {previewExactParsed &&
                    previewImpliedOdd != null &&
                    previewTendancePts != null &&
                    previewPerfectPts != null && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <Target className="size-4 shrink-0 text-primary" />
                        <span>
                          Vainqueur selon votre score :{" "}
                          <strong>
                            {matchResultLabel(
                              previewImpliedWinner!,
                              match.home_team.name,
                              match.away_team.name,
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {outcomes.map((outcome) => {
                          const active = previewImpliedWinner === outcome.key;
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
                              previewExactParsed.home,
                              previewExactParsed.away,
                            )}
                          </strong>
                          {" · "}
                          cote {previewImpliedOdd.toFixed(2)} (
                          {MATCH_RESULT_COPY.equivalentOdd})
                        </p>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Tendance : +{formatPoints(previewTendancePts)} pts
                            {isGolden
                              ? " (×2 Golden)"
                              : ` (${MATCH_RESULT_COPY.sameAsResult})`}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            Tout pile : +{formatPoints(previewPerfectPts)} pts
                            {previewPerfectPts > previewTendancePts &&
                              ` (×${Math.round(previewPerfectPts / previewTendancePts)})`}
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

                  {!canEditClassic && pending.hasExactScore ? (
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
                        loading ||
                        !parsedScore ||
                        impliedOdd == null ||
                        !bettingOpen ||
                        (pending.hasExactScore && !hasExactChange)
                      }
                    >
                      {loading
                        ? "Validation…"
                        : pending.hasExactScore
                          ? MATCH_RESULT_COPY.update
                          : "Valider le score exact"}
                    </Button>
                  )}
                </form>
              )}
            </CardContent>
            {tackleState && (
              <CardContent className="border-t border-border/50 pt-4">
                {classicBetConfirmed && (
                  <p className="mb-3 rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-sm text-lime-200">
                    Pronostic enregistré — choisis ton rival à tacler ci-dessous.
                  </p>
                )}
                <TacklePicker
                  matchId={match.id}
                  currentUserId={currentUserId}
                  hasClassicBet={hasClassicBet}
                  bettingOpen={bettingOpen}
                  rivals={tackleRivals}
                  tackleState={tackleState}
                />
              </CardContent>
            )}
          </Card>
    </motion.div>
  );
}
