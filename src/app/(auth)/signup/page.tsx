import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isFavoriteTeamSelectionOpenForSignup } from "@/lib/profile/favorite-team-selection";
import { getAllTournamentTeamsForSignup } from "@/lib/tournament/queries";
import { getTournamentConfig } from "@/lib/tournament/config";

export const metadata = {
  title: "Inscription · WC2026 Pool",
};

export default async function SignupPage() {
  const [teams, selectionOpen, config] = await Promise.all([
    getAllTournamentTeamsForSignup(),
    isFavoriteTeamSelectionOpenForSignup(),
    getTournamentConfig(),
  ]);

  return (
    <Card className="w-full max-w-lg border-border/80">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Créer un compte</CardTitle>
        <CardDescription>
          Choisissez un pseudo
          {selectionOpen ? ", votre équipe favorite" : ""} et pariez avec vos
          amis sur la Coupe du Monde 2026
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm
          teams={teams}
          selectionOpen={selectionOpen}
          bonusPoints={config.favoriteTeamBonusPoints}
        />
      </CardContent>
    </Card>
  );
}
