import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireAuth } from "@/lib/auth-server";
import {
  filterUnansweredOnboardingQuestions,
  getActiveOnboardingQuestionsAsync,
} from "@/lib/onboarding/questions";
import {
  getOnboardingContext,
  getTournamentSquadPlayers,
} from "@/lib/onboarding/queries";
import { isFavoriteTeamSelectionOpen } from "@/lib/profile/favorite-team-selection";
import { getAllTournamentTeams } from "@/lib/tournament/queries";
import { getTournamentConfig } from "@/lib/tournament/config";

export const metadata = { title: "Vos pronostics" };

export default async function OnboardingPage() {
  const profile = await requireAuth();
  const { campaignId, campaign, needsOnboarding, picks, completedCampaignId } =
    await getOnboardingContext(profile.id);

  if (!needsOnboarding) {
    redirect("/dashboard");
  }

  const [teams, players, selectionOpen, config] = await Promise.all([
    getAllTournamentTeams(),
    getTournamentSquadPlayers(),
    isFavoriteTeamSelectionOpen(),
    getTournamentConfig(),
  ]);

  const allQuestions = await getActiveOnboardingQuestionsAsync(
    campaignId,
    selectionOpen,
  );

  const seededPicks = [...picks];
  if (
    profile.favorite_team_id != null &&
    allQuestions.some((q) => q.id === "favorite_team") &&
    !seededPicks.some((p) => p.question_id === "favorite_team")
  ) {
    const favTeam = teams.find((t) => t.id === profile.favorite_team_id);
    if (favTeam) {
      seededPicks.push({
        question_id: "favorite_team",
        answer: { team_id: favTeam.id },
        points_potential: config.favoriteTeamBonusPoints,
      });
    }
  }

  const unansweredQuestions = filterUnansweredOnboardingQuestions(
    allQuestions,
    seededPicks,
  );

  // Mode partiel uniquement si le joueur a déjà complété cette campagne
  // (ex. nouvelle question ajoutée) — pas pendant la première passée.
  const partialMode =
    completedCampaignId === campaignId &&
    unansweredQuestions.length > 0 &&
    unansweredQuestions.length < allQuestions.length;

  const questionsToShow = partialMode ? unansweredQuestions : allQuestions;

  return (
    <OnboardingWizard
      campaign={campaign}
      campaignId={campaignId}
      teams={teams}
      players={players}
      questions={questionsToShow}
      existingPicks={seededPicks}
      favoriteTeamBonusPoints={config.favoriteTeamBonusPoints}
      isReturningUser={Boolean(profile.favorite_team_id) || picks.length > 0}
      partialMode={partialMode}
      totalCampaignQuestions={allQuestions.length}
      summaryQuestions={allQuestions}
    />
  );
}
