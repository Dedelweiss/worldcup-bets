import { AppShellClient } from "@/components/layout/app-shell-client";
import { getProfile, hasSupabaseConfig } from "@/lib/auth-server";
import { getLiveBetsSnapshot } from "@/lib/live-bets/live-bet-snapshot";
import { isF1ModeEnabled } from "@/lib/f1/queries";
import { getActiveSportForUser } from "@/lib/sport/active-sport";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = hasSupabaseConfig ? await getProfile() : null;
  const [livePendingCount, activeSport, f1Enabled] = await Promise.all([
    profile != null
      ? getLiveBetsSnapshot(profile.id).then((s) => s.livePendingCount)
      : Promise.resolve(0),
    getActiveSportForUser(profile?.id),
    isF1ModeEnabled(),
  ]);

  return (
    <AppShellClient
      storedActiveSport={activeSport}
      profile={profile}
      f1Enabled={f1Enabled}
      livePendingCount={livePendingCount}
    >
      {children}
    </AppShellClient>
  );
}
