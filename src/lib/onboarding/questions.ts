import type { OnboardingQuestion } from "@/lib/onboarding/types";

const WC2026_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "favorite_team",
    type: "team",
    title: "Quelle est votre équipe favorite ?",
    subtitle: "Bonus si elle remporte la Coupe du Monde",
    pointsPotential: 100,
    required: true,
    requiresFavoriteTeamOpen: true,
  },
  {
    id: "top_scorer",
    type: "player",
    title: "Qui sera le meilleur buteur ?",
    subtitle: "Soulier d'or du tournoi",
    pointsPotential: 50,
    required: true,
  },
  {
    id: "top_assister",
    type: "player",
    title: "Qui sera le meilleur passeur ?",
    subtitle: "Soulier d'argent du tournoi",
    pointsPotential: 40,
    required: true,
  },
  {
    id: "finalist_a",
    type: "team",
    title: "Première finaliste",
    subtitle: "L'une des deux équipes de la finale",
    pointsPotential: 30,
    required: true,
  },
  {
    id: "finalist_b",
    type: "team",
    title: "Deuxième finaliste",
    subtitle: "Doit être une équipe différente",
    pointsPotential: 30,
    required: true,
    excludeSameTeamAs: "finalist_a",
  },
  {
    id: "most_goals_team",
    type: "team",
    title: "Quelle équipe marquera le plus de buts ?",
    subtitle: "Sur l'ensemble du tournoi",
    pointsPotential: 25,
    required: true,
  },
  {
    id: "total_goals",
    type: "choice",
    title: "Combien de buts au total ?",
    subtitle: "Tous matchs confondus",
    pointsPotential: 20,
    required: true,
    options: [
      {
        id: "lt_130",
        label: "Moins de 130",
        description: "Tournoi plutôt fermé",
      },
      {
        id: "130_150",
        label: "Entre 130 et 150",
        description: "Fourchette classique",
      },
      { id: "gt_150", label: "Plus de 150", description: "Festival offensif" },
    ],
  },
];

/** Questions par campagne événementielle — extensible (Euro 2028, etc.). */
export const QUESTIONS_BY_CAMPAIGN: Record<string, OnboardingQuestion[]> = {
  wc2026: WC2026_QUESTIONS,
  euro2028: [],
};

export function getQuestionsForCampaign(campaignId: string): OnboardingQuestion[] {
  return QUESTIONS_BY_CAMPAIGN[campaignId] ?? WC2026_QUESTIONS;
}

export function getActiveOnboardingQuestions(
  campaignId: string,
  favoriteTeamSelectionOpen: boolean,
): OnboardingQuestion[] {
  return getQuestionsForCampaign(campaignId).filter((q) => {
    if (q.requiresFavoriteTeamOpen && !favoriteTeamSelectionOpen) {
      return false;
    }
    return true;
  });
}

export function getRequiredQuestionIds(
  campaignId: string,
  favoriteTeamSelectionOpen: boolean,
): string[] {
  return getActiveOnboardingQuestions(campaignId, favoriteTeamSelectionOpen)
    .filter((q) => q.required)
    .map((q) => q.id);
}

import { getCampaignQuestionsFromDb } from "@/lib/prediction-campaigns/db";

export async function getActiveOnboardingQuestionsAsync(
  campaignId: string,
  favoriteTeamSelectionOpen: boolean,
): Promise<OnboardingQuestion[]> {
  const questions = await getCampaignQuestionsFromDb(campaignId);
  return questions.filter((q) => {
    if (q.requiresFavoriteTeamOpen && !favoriteTeamSelectionOpen) {
      return false;
    }
    return true;
  });
}

export async function getRequiredQuestionIdsAsync(
  campaignId: string,
  favoriteTeamSelectionOpen: boolean,
): Promise<string[]> {
  const questions = await getActiveOnboardingQuestionsAsync(
    campaignId,
    favoriteTeamSelectionOpen,
  );
  return questions.filter((q) => q.required).map((q) => q.id);
}

export async function findOnboardingQuestionAsync(
  campaignId: string,
  id: string,
): Promise<OnboardingQuestion | undefined> {
  const questions = await getCampaignQuestionsFromDb(campaignId);
  return questions.find((q) => q.id === id);
}

export function filterUnansweredOnboardingQuestions(
  questions: OnboardingQuestion[],
  picks: { question_id: string }[],
): OnboardingQuestion[] {
  const answered = new Set(picks.map((p) => p.question_id));
  return questions.filter((q) => !answered.has(q.id));
}
