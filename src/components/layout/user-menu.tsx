import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface UserMenuProps {
  profile: Pick<Profile, "display_name" | "avatar_url" | "balance">;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ profile }: UserMenuProps) {
  const displayName = profile.display_name ?? "Joueur";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium leading-none">{displayName}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
          {profile.balance.toFixed(2)} €
        </p>
      </div>
      <Avatar className="size-8">
        {profile.avatar_url && (
          <AvatarImage src={profile.avatar_url} alt={displayName} />
        )}
        <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
      </Avatar>
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
