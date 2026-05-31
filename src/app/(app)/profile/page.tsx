import { UsernameForm } from "@/components/profile/username-form";
import { requireAuth } from "@/lib/auth-server";
import { getPlayerLabel } from "@/lib/profile/player-label";

export const metadata = { title: "Mon profil · WC2026 Pool" };

export default async function ProfilePage() {
  const profile = await requireAuth();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">
          Connecté en tant que{" "}
          <span className="font-medium text-foreground">
            {getPlayerLabel(profile)}
          </span>
        </p>
      </div>

      <UsernameForm currentUsername={profile.username} />
    </div>
  );
}
