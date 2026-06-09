"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Home, ListTodo, Shield, Trophy, User, type LucideIcon } from "lucide-react";
import { bindHapticClick } from "@/lib/haptics";
import {
  getPlayerInitials,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";

const tabsBase = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/matches", label: "Matchs", icon: ListTodo },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/profile", label: "Profil" },
] as const;

const adminTab = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
} as const;

type IconTab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type ProfileTab = {
  href: "/profile";
  label: "Profil";
};

type NavTab = IconTab | ProfileTab | typeof adminTab;

const INDICATOR_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.75,
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  if (href === "/matches") {
    return (
      pathname === "/matches" ||
      pathname.startsWith("/matches/") ||
      pathname.startsWith("/matches?") ||
      pathname === "/matches/quick"
    );
  }
  return pathname.startsWith(`${href}/`);
}

interface BottomNavProfile {
  avatar_url?: string | null;
  username?: string | null;
  display_name?: string | null;
}

interface BottomNavProps {
  showAdmin?: boolean;
  profile?: BottomNavProfile | null;
}

function NavProfileAvatar({
  profile,
  active,
}: {
  profile: BottomNavProfile;
  active: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = profile.avatar_url?.trim() || null;
  const showImage = Boolean(avatarUrl) && !imageFailed;
  const initials = getPlayerInitials(profile);

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-zinc-800/80 transition-[box-shadow,border-color] duration-300",
        active
          ? "border-lime-400/70 shadow-[0_0_10px_rgba(163,230,53,0.45)]"
          : "border-white/15",
      )}
    >
      {showImage ? (
        <img
          src={avatarUrl!}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-[9px] font-semibold text-lime-300/90">
          {initials}
        </span>
      )}
    </span>
  );
}

function NavTabIcon({
  tab,
  active,
  profile,
}: {
  tab: NavTab;
  active: boolean;
  profile: BottomNavProfile | null;
}) {
  if (tab.href === "/profile") {
    if (profile) {
      return <NavProfileAvatar profile={profile} active={active} />;
    }
    return (
      <User
        className={cn(
          "size-6 shrink-0 transition-[filter] duration-300",
          active && "drop-shadow-[0_0_10px_rgba(163,230,53,0.55)]",
        )}
        aria-hidden
      />
    );
  }

  if (!("icon" in tab) || !tab.icon) return null;

  const Icon = tab.icon;
  return (
    <Icon
      className={cn(
        "size-6 shrink-0 transition-[filter] duration-300",
        active && "drop-shadow-[0_0_10px_rgba(163,230,53,0.55)]",
      )}
      aria-hidden
    />
  );
}

export function BottomNav({ showAdmin, profile = null }: BottomNavProps) {
  const pathname = usePathname();
  const tabs: NavTab[] = showAdmin ? [...tabsBase, adminTab] : [...tabsBase];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
      <nav
        className={cn(
          "pointer-events-auto relative mx-auto max-w-lg overflow-hidden rounded-[1.35rem]",
          "border border-white/12 bg-zinc-950/45 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]",
          "ring-1 ring-white/5 backdrop-blur-2xl backdrop-saturate-150",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:bg-gradient-to-b before:from-white/[0.09] before:to-transparent",
        )}
        aria-label="Navigation principale"
      >
        <LayoutGroup id="bottom-nav">
          <ul className="relative flex items-stretch justify-around px-1 py-1">
            {tabs.map((tab) => {
              const { href, label } = tab;
              const active = isActive(pathname, href);
              const isAdmin = href === "/admin";

              return (
                <li key={href} className="relative min-w-0 flex-1">
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active-pill"
                      className={cn(
                        "absolute inset-x-1 inset-y-0.5 rounded-2xl",
                        "bg-lime-400/14 shadow-[inset_0_0_16px_rgba(163,230,53,0.12)]",
                        "ring-1 ring-lime-400/25",
                        isAdmin && "bg-lime-300/12 ring-lime-300/30",
                      )}
                      transition={INDICATOR_SPRING}
                    />
                  )}

                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    onClick={bindHapticClick(undefined, "selection")}
                    className={cn(
                      "relative z-10 flex cursor-pointer items-center justify-center rounded-xl px-2 py-2.5 transition-colors duration-300",
                      active
                        ? "text-lime-300"
                        : "text-zinc-500 hover:text-zinc-300",
                      isAdmin && !active && "text-lime-400/70 hover:text-lime-300",
                    )}
                  >
                    <motion.span
                      className="flex items-center justify-center"
                      animate={{ scale: active ? 1.08 : 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <NavTabIcon tab={tab} active={active} profile={profile} />
                    </motion.span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>
    </div>
  );
}
