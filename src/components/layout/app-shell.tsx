import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getProfile, hasSupabaseConfig } from "@/lib/auth-server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = hasSupabaseConfig ? await getProfile() : null;

  return (
    <div className="min-h-full bg-zinc-950">
      <AppSidebar profile={profile} />
      <div className="flex min-h-full min-w-0 flex-col overflow-x-hidden md:pl-64">
        <AppHeader profile={profile} />
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav
        showAdmin={profile?.role === "admin"}
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
