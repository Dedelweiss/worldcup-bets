import { MatchLiveBets } from "@/components/matches/match-live-bets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchLiveBetRow } from "@/lib/bets/match-live-bets";
import type { MatchStatus } from "@/types/database";

interface AdminMatchBetsPanelProps {
  matchId: number;
  matchStatus: MatchStatus;
  isGoldenMatch?: boolean;
  bets: MatchLiveBetRow[];
}

export function AdminMatchBetsPanel({
  matchId,
  matchStatus,
  isGoldenMatch = false,
  bets,
}: AdminMatchBetsPanelProps) {
  if (matchStatus !== "live" && matchStatus !== "finished") {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pronostics des joueurs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vue complète pour l&apos;admin — tous les paris classiques et fun
          enregistrés sur le match #{matchId}
          {matchStatus === "finished" ? " (terminé, clôture séparée)." : "."}
        </p>
      </CardHeader>
      <CardContent>
        <MatchLiveBets
          bets={bets}
          currentUserId=""
          isGoldenMatch={isGoldenMatch}
          adminView
        />
      </CardContent>
    </Card>
  );
}
