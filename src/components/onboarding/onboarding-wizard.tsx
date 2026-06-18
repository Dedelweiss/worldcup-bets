"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeOnboardingAction,
  saveOnboardingPickAction,
} from "@/app/onboarding/actions";
import {
  OnboardingCampaignBadge,
  OnboardingResumeBanner,
} from "@/components/onboarding/onboarding-campaign-badge";
import { OnboardingAmbientBackground } from "@/components/onboarding/onboarding-ambient-background";
import { OnboardingChoiceCards } from "@/components/onboarding/onboarding-choice-cards";
import { OnboardingPlayerList } from "@/components/onboarding/onboarding-player-list";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingStepIcon } from "@/components/onboarding/onboarding-step-icon";
import { OnboardingStepTitle } from "@/components/onboarding/onboarding-step-icon";
import { OnboardingTeamGrid } from "@/components/onboarding/onboarding-team-grid";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import type { PredictionCampaign } from "@/lib/onboarding/campaigns";
import {
  getStepTheme,
  resolveWizardStepKey,
  stepTransition,
} from "@/lib/onboarding/step-themes";
import { useIsClient } from "@/lib/use-is-client";
import type {
  OnboardingPlayerOption,
  OnboardingQuestion,
  TournamentPickAnswer,
  TournamentPickRow,
} from "@/lib/onboarding/types";
import type { TournamentTeam } from "@/types/database";

type WizardStep =
  | { kind: "intro" }
  | { kind: "question"; question: OnboardingQuestion }
  | { kind: "summary" };

interface OnboardingWizardProps {
  campaign: PredictionCampaign;
  campaignId: string;
  teams: TournamentTeam[];
  players: OnboardingPlayerOption[];
  questions: OnboardingQuestion[];
  existingPicks: TournamentPickRow[];
  favoriteTeamBonusPoints: number;
  isReturningUser: boolean;
  /** Joueur ayant déjà répondu — ne montre que les questions manquantes */
  partialMode?: boolean;
  totalCampaignQuestions?: number;
  /** Questions affichées dans le récap (toutes si mode partiel) */
  summaryQuestions?: OnboardingQuestion[];
}

function pickToTeamId(pick: TournamentPickRow | undefined): number | null {
  if (!pick || !("team_id" in pick.answer)) return null;
  return pick.answer.team_id;
}

function pickToPlayerId(pick: TournamentPickRow | undefined): number | null {
  if (!pick || !("player_id" in pick.answer)) return null;
  return pick.answer.player_id;
}

function pickToChoiceId(pick: TournamentPickRow | undefined): string | null {
  if (!pick || !("choice_id" in pick.answer)) return null;
  return pick.answer.choice_id;
}

function computeFirstStepIndex(
  picks: Map<string, TournamentPickRow>,
  steps: WizardStep[],
  questionCount: number,
): number {
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind !== "question") continue;
    if (!picks.has(step.question.id)) return i;
  }
  if (picks.size >= questionCount) {
    return steps.length - 1;
  }
  return 0;
}

export function OnboardingWizard({
  campaign,
  campaignId,
  teams,
  players,
  questions,
  existingPicks,
  favoriteTeamBonusPoints,
  isReturningUser,
  partialMode = false,
  totalCampaignQuestions,
  summaryQuestions: summaryQuestionsProp,
}: OnboardingWizardProps) {
  const summaryQuestions = summaryQuestionsProp ?? questions;
  const router = useRouter();
  const isClient = useIsClient();
  const picksMap = useMemo(
    () => new Map(existingPicks.map((p) => [p.question_id, p])),
    [existingPicks],
  );
  const [savedPicks, setSavedPicks] = useState(() => picksMap);

  useEffect(() => {
    setSavedPicks(picksMap);
  }, [picksMap]);

  const steps: WizardStep[] = useMemo(() => {
    const questionSteps = questions.map((question) => ({
      kind: "question" as const,
      question,
    }));

    if (partialMode) {
      return [...questionSteps, { kind: "summary" as const }];
    }

    return [
      { kind: "intro" },
      ...questionSteps,
      { kind: "summary" },
    ];
  }, [questions, partialMode]);

  const [stepIndex, setStepIndex] = useState(() =>
    partialMode
      ? 0
      : computeFirstStepIndex(
          picksMap,
          [
            { kind: "intro" },
            ...questions.map((question) => ({
              kind: "question" as const,
              question,
            })),
            { kind: "summary" },
          ],
          questions.length,
        ),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamSelection, setTeamSelection] = useState<number | null>(null);
  const [playerSelection, setPlayerSelection] =
    useState<OnboardingPlayerOption | null>(null);
  const [choiceSelection, setChoiceSelection] = useState<string | null>(null);

  const currentStep = steps[stepIndex];
  const stepKey = resolveWizardStepKey(
    currentStep.kind === "question"
      ? { kind: "question", questionId: currentStep.question.id }
      : { kind: currentStep.kind },
  );
  const stepTheme = getStepTheme(stepKey);
  const totalSteps = Math.max(steps.length - 1, 1);
  const progressStep = stepIndex;
  const answeredInCampaign =
    (totalCampaignQuestions ?? questions.length) - questions.length;
  const answeredCount = answeredInCampaign + questions.filter((q) => savedPicks.has(q.id)).length;
  const totalCount = totalCampaignQuestions ?? questions.length;
  const missingCount = questions.filter((q) => !savedPicks.has(q.id)).length;

  const resetLocalSelection = useCallback(
    (question: OnboardingQuestion) => {
      const existing = savedPicks.get(question.id);
      if (question.type === "team") {
        setTeamSelection(pickToTeamId(existing));
      } else if (question.type === "player") {
        const pid = pickToPlayerId(existing);
        if (pid != null && existing && "player_id" in existing.answer) {
          const a = existing.answer;
          setPlayerSelection({
            playerId: a.player_id,
            playerName: a.player_name,
            teamId: a.team_id,
            teamName: a.team_name,
            teamCode: null,
            position: null,
            shirtNumber: null,
          });
        } else {
          setPlayerSelection(null);
        }
      } else {
        setChoiceSelection(pickToChoiceId(existing));
      }
    },
    [savedPicks],
  );

  const goToStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (step?.kind === "question") {
        resetLocalSelection(step.question);
      }
      setError(null);
      setStepIndex(index);
    },
    [steps, resetLocalSelection],
  );

  const excludeTeamId = useMemo(() => {
    if (currentStep.kind !== "question") return null;
    const excludeQ = currentStep.question.excludeSameTeamAs;
    if (!excludeQ) return null;
    return pickToTeamId(savedPicks.get(excludeQ));
  }, [currentStep, savedPicks]);

  const canContinue = useMemo(() => {
    if (currentStep.kind === "intro") return true;
    if (currentStep.kind === "summary") return true;
    const q = currentStep.question;
    if (q.type === "team") return teamSelection != null;
    if (q.type === "player") return playerSelection != null;
    return choiceSelection != null;
  }, [currentStep, teamSelection, playerSelection, choiceSelection]);

  async function persistCurrentAnswer(): Promise<boolean> {
    if (currentStep.kind !== "question") return true;

    const q = currentStep.question;
    let answer: TournamentPickAnswer;

    if (q.type === "team") {
      if (teamSelection == null) return false;
      answer = { team_id: teamSelection };
    } else if (q.type === "player") {
      if (!playerSelection) return false;
      answer = {
        player_id: playerSelection.playerId,
        player_name: playerSelection.playerName,
        team_id: playerSelection.teamId,
        team_name: playerSelection.teamName,
      };
    } else {
      if (!choiceSelection) return false;
      answer = { choice_id: choiceSelection };
    }

    setLoading(true);
    setError(null);
    const result = await saveOnboardingPickAction(campaignId, q.id, answer);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return false;
    }

    setSavedPicks((prev) => {
      const next = new Map(prev);
      next.set(q.id, {
        question_id: q.id,
        answer,
        points_potential: q.pointsPotential,
      });
      return next;
    });
    return true;
  }

  async function handleContinue() {
    if (currentStep.kind === "summary") {
      const missingRequired = summaryQuestions.filter(
        (q) => q.required && !savedPicks.has(q.id),
      );
      if (missingRequired.length > 0) {
        setError(
          `Réponse manquante : ${missingRequired.map((q) => q.title).join(", ")}. Revenez en arrière pour compléter.`,
        );
        return;
      }

      setLoading(true);
      setError(null);
      const result = await completeOnboardingAction(campaignId);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (currentStep.kind === "question") {
      const ok = await persistCurrentAnswer();
      if (!ok) return;
    }

    if (stepIndex < steps.length - 1) {
      goToStep(stepIndex + 1);
      router.refresh();
    }
  }

  function handleBack() {
    if (stepIndex > 0) goToStep(stepIndex - 1);
  }

  const pointsLabel =
    currentStep.kind === "question"
      ? currentStep.question.id === "favorite_team"
        ? favoriteTeamBonusPoints
        : currentStep.question.pointsPotential
      : null;

  const ambientClass = `${campaign.theme.ambient} ${stepTheme.ambient}`;

  const stepBody = (
    <>
      {currentStep.kind === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <OnboardingStepIcon theme={stepTheme} className="mb-6" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {campaign.intro.title}
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
            {campaign.intro.subtitle}
          </p>
          <ul className="mt-8 max-w-sm space-y-2.5 text-left text-sm text-muted-foreground">
            <li>· {questions.length} pronostics à verrouiller</li>
            <li>· Un choix par question, pour toute la durée du tournoi</li>
            <li>· Points bonus en fin de compétition si vous avez bon</li>
          </ul>
        </div>
      )}

      {currentStep.kind === "question" && (
        <>
          <OnboardingStepTitle
            stepKey={stepKey}
            title={currentStep.question.title}
            subtitle={currentStep.question.subtitle}
            accentLine={
              pointsLabel != null && pointsLabel > 0
                ? `Jusqu'à +${formatPoints(pointsLabel)} pts si correct`
                : undefined
            }
          />

          <div className="flex min-h-0 flex-1 flex-col">
            {currentStep.question.type === "team" && (
              <OnboardingTeamGrid
                teams={teams}
                value={teamSelection}
                onChange={setTeamSelection}
                disabled={loading}
                excludeTeamId={excludeTeamId}
                accentClass={stepTheme.accentClass}
              />
            )}
            {currentStep.question.type === "player" && (
              <OnboardingPlayerList
                players={players}
                value={playerSelection?.playerId ?? null}
                onChange={setPlayerSelection}
                disabled={loading}
                accentClass={stepTheme.accentClass}
              />
            )}
            {currentStep.question.type === "choice" &&
              currentStep.question.options && (
                <OnboardingChoiceCards
                  options={currentStep.question.options}
                  value={choiceSelection}
                  onChange={setChoiceSelection}
                  disabled={loading}
                  accentClass={stepTheme.accentClass}
                />
              )}
          </div>
        </>
      )}

      {currentStep.kind === "summary" && (
        <div className="flex flex-1 flex-col">
          <div className="mb-6 text-center">
            <OnboardingStepIcon theme={stepTheme} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Récapitulatif</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {partialMode
                ? `Vérifiez vos pronostics ${campaign.shortLabel} avant de continuer.`
                : `Vérifiez vos choix — verrouillés pour ${campaign.shortLabel}.`}
            </p>
          </div>
          <ul className="flex-1 space-y-3 overflow-y-auto">
            {summaryQuestions.map((q) => {
              const pick = savedPicks.get(q.id);
              return (
                <li
                  key={q.id}
                  className="rounded-xl border border-border/50 bg-card/40 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-xs text-muted-foreground">{q.title}</p>
                  <SummaryAnswer question={q} pick={pick} teams={teams} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <div className="relative flex h-[100dvh] flex-col">
      <OnboardingAmbientBackground
        stepKey={stepKey}
        ambientClass={ambientClass}
        orbA={stepTheme.orbA}
        orbB={stepTheme.orbB}
        particles={stepTheme.particles}
      />

      <header className="relative z-10 shrink-0 border-b border-white/5 px-4 pb-4 pt-2 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          <div className="flex items-center justify-center">
            <OnboardingCampaignBadge campaign={campaign} />
          </div>
          <OnboardingResumeBanner
            campaign={campaign}
            answeredCount={answeredCount}
            totalCount={totalCount}
            isReturning={isReturningUser}
            partialMode={partialMode}
            missingCount={missingCount}
          />
          <div className="flex items-center gap-3">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleBack}
                disabled={loading}
                aria-label="Étape précédente"
              >
                <ArrowLeft className="size-5" />
              </Button>
            ) : (
              <div className="size-9 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <OnboardingProgress
                current={progressStep}
                total={totalSteps}
                accentClass={stepTheme.progressBarClass}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4 py-4">
        {isClient ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              {...stepTransition}
              className="flex min-h-0 flex-1 flex-col"
            >
              {stepBody}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{stepBody}</div>
        )}
      </main>

      <footer className="relative z-10 shrink-0 border-t border-white/5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-lg space-y-2">
          {error && (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="button"
            className="h-12 w-full text-base shadow-lg shadow-primary/10"
            disabled={!canContinue || loading}
            onClick={() => void handleContinue()}
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : currentStep.kind === "summary" ? (
              "C'est parti !"
            ) : (
              <>
                Continuer
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function SummaryAnswer({
  question,
  pick,
  teams,
}: {
  question: OnboardingQuestion;
  pick: TournamentPickRow | undefined;
  teams: TournamentTeam[];
}) {
  if (!pick) {
    return (
      <p className="mt-1 text-sm text-amber-400">
        Non renseigné — revenez en arrière
      </p>
    );
  }

  if (question.type === "team" && "team_id" in pick.answer) {
    const teamId = pick.answer.team_id;
    const team = teams.find((t) => t.id === teamId);
    return (
      <div className="mt-1.5 flex items-center gap-2">
        {team && (
          <TeamFlag
            name={team.name}
            code={team.code}
            logoUrl={team.logo_url}
            size={24}
          />
        )}
        <span className="font-medium">
          {team?.name ?? `Équipe #${teamId}`}
        </span>
      </div>
    );
  }

  if (question.type === "player" && "player_name" in pick.answer) {
    return (
      <p className="mt-1 font-medium">
        {pick.answer.player_name}
        <span className="font-normal text-muted-foreground">
          {" "}
          · {pick.answer.team_name}
        </span>
      </p>
    );
  }

  if (question.type === "choice" && "choice_id" in pick.answer) {
    const choiceId = pick.answer.choice_id;
    const opt = question.options?.find((o) => o.id === choiceId);
    return <p className="mt-1 font-medium">{opt?.label ?? choiceId}</p>;
  }

  return null;
}
