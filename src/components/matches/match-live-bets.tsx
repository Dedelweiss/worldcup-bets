import { Badge } from "@/components/ui/badge";
import { formatOdd, formatPoints } from "@/lib/format";
import { betDisplayPayout } from "@/lib/points";
import { getPlayerLabel } from "@/lib/profile/player-label";
import type { MatchLiveBetRow } from "@/lib/bets/match-live-bets";

const SELECTION_LABEL: Record<string, string> = {
  home: "1 · Domicile",
  draw: "N · Nul",
  away: "2 · Extérieur",
  yes: "Oui",
  no: "Non",
};

function betChoiceLabel(bet: MatchLiveBetRow): string {
  if (bet.bet_type === "fun") {
    const out = bet.selection?.outcome ?? "";
    const q = bet.fun_question ? `${bet.fun_question} — ` : "";
    return `${q}${SELECTION_LABEL[out] ?? out}`;
  }
  const sel = bet.selection?.selection ?? "";
  return SELECTION_LABEL[sel] ?? sel;
}

function playerName(bet: MatchLiveBetRow): string {
  return getPlayerLabel(bet);
}

interface MatchLiveBetsProps {
  bets: MatchLiveBetRow[];
  currentUserId: string;
}

export function MatchLiveBets({ bets, currentUserId }: MatchLiveBetsProps) {
  if (bets.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-sm font-medium text-primary">Match en direct</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun pari en attente pour le moment. Les paris des joueurs apparaîtront
          ici pendant le live.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Paris des joueurs</h2>
          <Badge className="text-[10px]">En direct</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Visible uniquement pendant le match. Les points affichés sont ceux
          gagnés en cas de bon pronostic (selon la cote).
        </p>
      </div>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card">
        {bets.map((bet) => {
          const isYou = bet.user_id === currentUserId;
          return (
            <li
              key={bet.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {playerName(bet)}
                  {isYou && (
                    <span className="ml-1.5 text-xs font-normal text-primary">
                      (vous)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {bet.bet_type === "fun" && (
                    <span className="mr-1 text-[10px] uppercase">Fun</span>
                  )}
                  {betChoiceLabel(bet)}
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-xs text-muted-foreground">
                  Cote {formatOdd(bet.odd_at_placement)}
                </p>
                <p className="font-semibold text-primary">
                  +
                  {formatPoints(
                    betDisplayPayout(
                      bet.potential_payout,
                      bet.is_boosted,
                    ),
                  )}{" "}
                  pts
                  {bet.is_boosted && (
                    <span className="ml-1 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                      x2
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
