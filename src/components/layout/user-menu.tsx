"use client";

import { NavLink } from "@/components/layout/nav-link";
import { CircleHelp, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { bindHapticClick } from "@/lib/haptics";
import { formatPoints } from "@/lib/format";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface UserMenuProps {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url" | "points">;
  /** Sidebar étroite : pseudo tronqué, sans icône profil en double. */
  compact?: boolean;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ profile, compact = false }: UserMenuProps) {
  const displayName = getPlayerLabel(profile);

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1 sm:gap-1.5">
      <div
        className={cn(
          "min-w-0 flex-1 overflow-hidden",
          compact ? "block" : "hidden sm:block",
        )}
      >
        <p className="truncate text-left text-xs font-medium leading-none">
          {displayName}
        </p>
        <p className="mt-0.5 truncate text-left text-[10px] text-muted-foreground tabular-nums">
          {formatPoints(profile.points)} pts
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <NavLink
          href="/help"
          onClick={bindHapticClick(undefined, "light")}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0",
          )}
          title="Aide & règles"
        >
          <CircleHelp className="size-4" />
        </NavLink>
        <NavLink
          href="/profile"
          onClick={bindHapticClick(undefined, "light")}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0",
          )}
          title="Mon profil / pseudo"
        >
          <Avatar className="size-8 shrink-0">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </NavLink>
        <NavLink
          href="/profile"
          onClick={bindHapticClick(undefined, "light")}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "hidden shrink-0 min-[420px]:inline-flex",
            compact && "min-[420px]:hidden",
          )}
          title="Mon profil"
        >
          <User className="size-4" />
        </NavLink>
        <form action="/auth/signout" method="post" className="shrink-0">
          <button
            type="submit"
            onClick={bindHapticClick(undefined, "medium")}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            title="Se déconnecter"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
