import Link from "next/link";
import { CircleHelp, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface UserMenuProps {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url" | "points">;
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

export function UserMenu({ profile }: UserMenuProps) {
  const displayName = getPlayerLabel(profile);

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium leading-none">{displayName}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
          {formatPoints(profile.points)} pts
        </p>
      </div>
      <Link
        href="/help"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
        )}
        title="Aide & règles"
      >
        <CircleHelp className="size-4" />
      </Link>
      <Link
        href="/profile"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        title="Mon profil / pseudo"
      >
        <Avatar className="size-8">
          {profile.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          )}
          <AvatarFallback className="text-xs">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <Link
        href="/profile"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "hidden min-[420px]:inline-flex",
        )}
        title="Mon profil"
      >
        <User className="size-4" />
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          title="Se déconnecter"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
