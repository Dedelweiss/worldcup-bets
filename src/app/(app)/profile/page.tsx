import Link from "next/link";
import { PointsEvolutionChart } from "@/components/profile/points-evolution-chart";
import { UsernameForm } from "@/components/profile/username-form";
import { hasSupabaseConfig, requireAuth } from "@/lib/auth-server";
import {
  getMockPointsHistory,
  getPointsHistory,
} from "@/lib/profile/points-history";
import { getPlayerLabel } from "@/lib/profile/player-label";

export const metadata = { title: "Mon profil · WC2026 Pool" };

export default async function ProfilePage() {
  const profile = await requireAuth();

  const history = hasSupabaseConfig
    ? await getPointsHistory(profile.id, profile.points)
    : getMockPointsHistory(profile.points);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">
          Connecté en tant que{" "}
          <span className="font-medium text-foreground">
            {getPlayerLabel(profile)}
          </span>
          {" · "}
          <Link href="/help" className="text-primary hover:underline">
            Aide & règles
          </Link>
        </p>
      </div>

      <PointsEvolutionChart points={history} currentPoints={profile.points} />

      <UsernameForm currentUsername={profile.username} />
    </div>
  );
}
