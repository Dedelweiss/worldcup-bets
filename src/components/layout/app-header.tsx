import { NavLink } from "@/components/layout/nav-link";
import { Shield } from "lucide-react";
import { AppNavLinks } from "@/components/layout/app-nav-links";
import { HapticLink } from "@/components/ui/haptic-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteLogo } from "@/components/layout/site-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { appNav } from "@/components/layout/app-nav";
import { buttonVariants } from "@/components/ui/button";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  profile: Profile | null;
}

export function AppHeader({ profile }: AppHeaderProps) {
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <HapticLink
          href="/dashboard"
          haptic="light"
          className="flex min-w-0 items-center gap-2 font-heading font-semibold tracking-tight md:hidden"
        >
          <SiteLogo size={32} className="size-8" priority />
          <span className="truncate text-sm">
            WC<span className="text-lime-400">2026</span> Pool
          </span>
        </HapticLink>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <nav className="flex items-center gap-1 text-sm" aria-label="Raccourcis">
            <AppNavLinks
              items={appNav.slice(0, 4)}
              showAdmin={profile?.role === "admin"}
              variant="desktop"
            />
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-1 md:hidden">
          {isAdmin && (
            <HapticLink
              href="/admin"
              haptic="selection"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" }),
                "shrink-0 border-lime-400/40 bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 hover:text-lime-300",
              )}
              title="Administration"
              aria-label="Administration"
            >
              <Shield className="size-4" aria-hidden />
            </HapticLink>
          )}
          <MobileNav items={appNav} showAdmin={isAdmin} />
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <NavLink href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              Connexion
            </NavLink>
          )}
        </div>

        <div className="hidden md:block">
          {profile ? null : (
            <NavLink href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              Connexion
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
