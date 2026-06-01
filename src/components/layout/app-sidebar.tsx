import Link from "next/link";
import { AppNavLinks } from "@/components/layout/app-nav-links";
import { appNav } from "@/components/layout/app-nav";
import { SiteLogo } from "@/components/layout/site-logo";
import { UserMenu } from "@/components/layout/user-menu";
import type { Profile } from "@/types/database";

interface AppSidebarProps {
  profile: Profile | null;
}

export function AppSidebar({ profile }: AppSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-zinc-950/95 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2 font-heading text-base font-semibold tracking-tight"
        >
          <SiteLogo size={36} className="size-9" priority />
          <span>
            WC<span className="text-lime-400">2026</span>
            <span className="text-zinc-400"> Pool</span>
          </span>
        </Link>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm"
        aria-label="Navigation principale"
      >
        <AppNavLinks
          items={appNav}
          showAdmin={profile?.role === "admin"}
          variant="sidebar"
        />
      </nav>

      <div className="border-t border-white/10 p-3">
        {profile ? (
          <UserMenu profile={profile} />
        ) : (
          <Link
            href="/login"
            className="flex h-9 items-center justify-center rounded-lg bg-lime-400 text-sm font-semibold text-black hover:bg-lime-300"
          >
            Connexion
          </Link>
        )}
      </div>
    </aside>
  );
}
