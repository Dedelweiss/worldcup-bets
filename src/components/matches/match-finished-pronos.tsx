import { MatchPronosBoard } from "@/components/matches/match-pronos-board";
import type { MatchLiveBetRow } from "@/lib/bets/match-live-bets";
import type { PendingPlayerRow } from "@/lib/bets/match-pronos-groups";

interface MatchFinishedPronosProps {
  bets: MatchLiveBetRow[];
  currentUserId: string;
  isGoldenMatch?: boolean;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  pendingPlayers?: PendingPlayerRow[];
}

export function MatchFinishedPronos(props: MatchFinishedPronosProps) {
  return (
    <MatchPronosBoard
      mode="finished"
      matchStatus="finished"
      {...props}
    />
  );
}
