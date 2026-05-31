import { Trophy, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";
import { getPlayerLabel } from "@/lib/profile/player-label";
import type { Profile } from "@/types/database";

interface WalletCardProps {
  profile: Profile;
}

export function WalletCard({ profile }: WalletCardProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Mes points
        </CardTitle>
        <Trophy className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-primary">
          {formatPoints(profile.points)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Gagnés sur les paris réussis (selon la cote) ·{" "}
          {getPlayerLabel(profile)}
        </p>
        {(profile.boosts_available ?? 0) > 0 && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Zap className="size-3" />
            Boost x2 disponible (1 pari classique)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
