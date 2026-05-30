import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatKickoff, formatOdd } from "@/lib/format";
import type { BetRow, BetStatus } from "@/types/database";

const STATUS_LABEL: Record<BetStatus, string> = {
  pending: "En cours",
  won: "Gagné",
  lost: "Perdu",
  void: "Annulé",
  cancelled: "Annulé",
};

const STATUS_VARIANT: Record<
  BetStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  won: "default",
  lost: "destructive",
  void: "outline",
  cancelled: "outline",
};

const SELECTION_LABEL: Record<string, string> = {
  home: "Victoire domicile (1)",
  draw: "Match nul (N)",
  away: "Victoire extérieur (2)",
};

interface BetListProps {
  bets: BetRow[];
}

export function BetList({ bets }: BetListProps) {
  if (bets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucun pari pour le moment.{" "}
        <Link href="/dashboard" className="text-primary hover:underline">
          Parier sur un match
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {bets.map((bet) => {
        const sel = bet.selection?.selection ?? "";
        const match = bet.match;
        return (
          <Link
            key={bet.id}
            href={`/matches/${bet.match_id}`}
            className="block rounded-xl border border-border p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {match?.home_team?.name} vs {match?.away_team?.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {match?.kickoff_at
                    ? formatKickoff(match.kickoff_at)
                    : "Match"}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[bet.status]} className="shrink-0 text-[10px]">
                {STATUS_LABEL[bet.status]}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Pari</p>
                <p className="font-medium">
                  {SELECTION_LABEL[sel] ?? sel}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cote</p>
                <p className="font-medium tabular-nums">
                  {formatOdd(bet.odd_at_placement)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mise</p>
                <p className="font-medium tabular-nums">
                  {formatCurrency(bet.stake)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {bet.status === "won" ? "Gain" : "Gain potentiel"}
                </p>
                <p className="font-semibold tabular-nums text-primary">
                  {formatCurrency(
                    bet.status === "won"
                      ? bet.potential_payout
                      : bet.potential_payout,
                  )}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
