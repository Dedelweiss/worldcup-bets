import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChooseFavoriteTeamForm } from "@/components/profile/choose-favorite-team-form";
import { requireAuth } from "@/lib/auth-server";
import { getProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import {
  isFavoriteTeamSelectionOpen,
  profileNeedsFavoriteTeam,
} from "@/lib/profile/favorite-team-selection";
import { getAllTournamentTeams } from "@/lib/tournament/queries";
import { getTournamentConfig } from "@/lib/tournament/config";

export const metadata = { title: "Équipe favorite" };

export default async function ChooseFavoriteTeamPage() {
  const profile = await requireAuth();

  const [favorite, teams, selectionOpen, config] = await Promise.all([
    getProfileFavoriteTeam(profile.id),
    getAllTournamentTeams(),
    isFavoriteTeamSelectionOpen(),
    getTournamentConfig(),
  ]);

  if (favorite || !profileNeedsFavoriteTeam(profile)) {
    redirect("/dashboard");
  }

  if (!selectionOpen) {
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={null}>
      <ChooseFavoriteTeamForm
        teams={teams}
        bonusPoints={config.favoriteTeamBonusPoints}
      />
    </Suspense>
  );
}
