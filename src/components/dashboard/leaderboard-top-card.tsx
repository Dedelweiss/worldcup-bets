import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/database";

const rankStyles = [
  "text-lime-400",
  "text-zinc-300",
  "text-amber-600/90",
] as const;

interface LeaderboardTopCardProps {
  players: LeaderboardEntry[];
  isDemo?: boolean;
}

export function LeaderboardTopCard({ players, isDemo }: LeaderboardTopCardProps) {
  const podium = players.slice(0, 3);

  return (
    <Card className="h-full rounded-3xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Trophy className="size-5 text-lime-400" aria-hidden />
          Top 3 classement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {podium.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun joueur classé pour le moment.
          </p>
        ) : (
          <ol className="space-y-2">
            {podium.map((player, i) => (
              <li
                key={player.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5"
              >
                <Medal
                  className={cn("size-4 shrink-0", rankStyles[i] ?? "text-zinc-500")}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {getPlayerLabel({
                      display_name: player.display_name,
                      username: player.username,
                    })}
                  </p>
                  <p className="font-heading text-lg font-bold tabular-nums text-lime-400">
                    {formatPoints(player.balance)}
                  </p>
                </div>
                <span className="font-heading text-xs font-semibold text-zinc-500">
                  #{i + 1}
                </span>
              </li>
            ))}
          </ol>
        )}
        {!isDemo && (
          <Link
            href="/leaderboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
          >
            Voir le classement
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
