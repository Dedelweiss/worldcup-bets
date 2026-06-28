"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { resolveActiveSportForPath } from "@/lib/sport/resolve-active-sport-for-path";
import type { ActiveSport } from "@/lib/sport/constants";
import type { Profile } from "@/types/database";

interface AppShellClientProps {
  storedActiveSport: ActiveSport;
  profile: Profile | null;
  f1Enabled: boolean;
  livePendingCount: number;
  children: React.ReactNode;
}

export function AppShellClient({
  storedActiveSport,
  profile,
  f1Enabled,
  livePendingCount,
  children,
}: AppShellClientProps) {
  const pathname = usePathname();
  const activeSport = resolveActiveSportForPath(pathname, storedActiveSport);

  return (
    <div className="min-h-full bg-zinc-950">
      <AppSidebar profile={profile} activeSport={activeSport} />
      <div className="flex min-h-full min-w-0 flex-col overflow-x-hidden md:pl-64">
        <AppHeader
          profile={profile}
          activeSport={activeSport}
          f1Enabled={f1Enabled}
        />
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav
        showAdmin={profile?.role === "admin"}
        livePendingCount={livePendingCount}
        activeSport={activeSport}
        profile={
          profile
            ? {
                avatar_url: profile.avatar_url,
                username: profile.username,
                display_name: profile.display_name,
              }
            : null
        }
      />
    </div>
  );
}
