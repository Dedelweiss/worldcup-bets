import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteLogo } from "@/components/layout/site-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { getProfile, hasSupabaseConfig } from "@/lib/auth-server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const appNav = [
  { href: "/dashboard", label: "Paris" },
  { href: "/matches", label: "Calendrier" },
  { href: "/bracket", label: "Tournoi" },
  { href: "/leaderboard", label: "Classement" },
  { href: "/leagues", label: "Ligues" },
  { href: "/bets", label: "Mes paris" },
];

export async function AppHeader() {
  const profile = hasSupabaseConfig ? await getProfile() : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
        >
          <SiteLogo size={32} className="size-8" priority />
          <span className="truncate text-sm sm:text-base">
            WC<span className="text-primary">2026</span>
            <span className="hidden min-[380px]:inline"> Pool</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <MobileNav
            items={appNav}
            showAdmin={profile?.role === "admin"}
          />
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {appNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-primary transition-colors hover:bg-primary/10"
              >
                Admin
              </Link>
            )}
          </nav>
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
