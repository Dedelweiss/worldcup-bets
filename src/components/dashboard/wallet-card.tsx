import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Profile } from "@/types/database";

interface WalletCardProps {
  profile: Profile;
}

export function WalletCard({ profile }: WalletCardProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Mon portefeuille
        </CardTitle>
        <Wallet className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-primary">
          {formatCurrency(profile.balance)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Monnaie virtuelle · {profile.display_name ?? profile.username ?? "Joueur"}
        </p>
      </CardContent>
    </Card>
  );
}
