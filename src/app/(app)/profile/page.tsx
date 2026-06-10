import Link from "next/link";
import { PointsEvolutionChart } from "@/components/profile/points-evolution-chart";
import { AvatarPicker } from "@/components/profile/avatar-picker";
import { PronostiqueurCard } from "@/components/profile/pronostiqueur-card";
import { ProfileBadgesSection } from "@/components/profile/profile-badges-section";
import { UsernameForm } from "@/components/profile/username-form";
import { getUserBets } from "@/lib/bets";
import { hasSupabaseConfig, requireAuth } from "@/lib/auth-server";
import { getAllMatchesForStats } from "@/lib/matches";
import { calculateFUTStats } from "@/lib/profile/calculate-fut-stats";
import { getProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import {
  getMockPointsHistory,
  getPointsHistory,
} from "@/lib/profile/points-history";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { getUserBadgeCollection } from "@/lib/profile/user-badges";

export const metadata = { title: "Mon profil · WC2026 Pool" };

export default async function ProfilePage() {
  const profile = await requireAuth();

  const [history, userBets, favoriteTeam, allMatches, badgeCollection] =
    await Promise.all([
      hasSupabaseConfig
        ? getPointsHistory(profile.id, profile.points)
        : Promise.resolve(getMockPointsHistory(profile.points)),
      hasSupabaseConfig ? getUserBets(profile.id) : Promise.resolve([]),
      hasSupabaseConfig
        ? getProfileFavoriteTeam(profile.id)
        : Promise.resolve(null),
      hasSupabaseConfig ? getAllMatchesForStats() : Promise.resolve([]),
      hasSupabaseConfig
        ? getUserBadgeCollection(profile.id)
        : Promise.resolve(null),
    ]);

  const futStats = calculateFUTStats(userBets, allMatches);
  const playerName = getPlayerLabel(profile);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">
          Connecté en tant que{" "}
          <span className="font-medium text-foreground">{playerName}</span>
          {" · "}
          <Link href="/help" className="text-primary hover:underline">
            Aide & règles
          </Link>
        </p>
      </div>

      <section className="flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-md">
        <PronostiqueurCard
          playerName={playerName}
          avatarUrl={profile.avatar_url}
          favoriteTeam={favoriteTeam?.team ?? null}
          futStats={futStats}
        />
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          Carte Ultimate Team — stats calculées depuis vos pronostics classiques.
          Sur mobile, « Partager » ouvre Instagram, Stories, WhatsApp…
        </p>
      </section>

      <PointsEvolutionChart points={history} currentPoints={profile.points} />

      {badgeCollection && (
        <ProfileBadgesSection
          catalog={badgeCollection.catalog}
          unlocked={badgeCollection.unlocked}
          selectedIds={badgeCollection.selectedIds}
        />
      )}

      <AvatarPicker
        currentAvatarId={profile.avatar_id ?? null}
        currentAvatarUrl={profile.avatar_url}
      />

      <UsernameForm currentUsername={profile.username} />
    </div>
  );
}
