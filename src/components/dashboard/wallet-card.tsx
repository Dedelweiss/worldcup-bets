import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";
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
          {profile.display_name ?? profile.username ?? "Joueur"}
        </p>
      </CardContent>
    </Card>
  );
}
