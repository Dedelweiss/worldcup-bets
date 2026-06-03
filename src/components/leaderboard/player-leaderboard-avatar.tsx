import { Bot } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";

interface PlayerLeaderboardAvatarProps {
  player: {
    avatar_url?: string | null;
    username?: string | null;
    display_name?: string | null;
    is_ai?: boolean;
  };
  size?: "sm" | "default";
  className?: string;
}

export function PlayerLeaderboardAvatar({
  player,
  size = "default",
  className,
}: PlayerLeaderboardAvatarProps) {
  const label = getPlayerLabel(player);
  const initials = getPlayerInitials(player);

  return (
    <Avatar
      size={size === "sm" ? "sm" : "default"}
      className={cn(
        "shrink-0 border border-border/80 bg-muted/50",
        size === "sm" ? "size-7" : "size-8",
        player.is_ai && "border-violet-500/40 bg-violet-500/10",
        className,
      )}
    >
      {player.avatar_url ? (
        <AvatarImage src={player.avatar_url} alt="" />
      ) : null}
      <AvatarFallback
        className={cn(
          "font-semibold",
          size === "sm" ? "text-[10px]" : "text-xs",
          player.is_ai && "text-violet-600 dark:text-violet-300",
        )}
      >
        {player.is_ai ? (
          <Bot className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
        ) : (
          initials
        )}
      </AvatarFallback>
      <span className="sr-only">{label}</span>
    </Avatar>
  );
}
