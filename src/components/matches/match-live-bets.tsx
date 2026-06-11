import { Badge } from "@/components/ui/badge";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import {
  formatExactScoreSelection,
  parseExactScoreSelection,
} from "@/lib/exact-score";
import { MATCH_RESULT_OUTCOME } from "@/lib/bets/match-result-copy";
import { formatOdd, formatPoints } from "@/lib/format";
import type { BetStatus } from "@/types/database";
import { betDisplayPayout } from "@/lib/points";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { isAiPlayer } from "@/lib/ai/constants";
import type { MatchLiveBetRow } from "@/lib/bets/match-live-bets";

const SELECTION_LABEL: Record<string, string> = {
  home: MATCH_RESULT_OUTCOME.home,
  draw: MATCH_RESULT_OUTCOME.draw,
  away: MATCH_RESULT_OUTCOME.away,
  yes: "Oui",
  no: "Non",
};

function betChoiceLabel(bet: MatchLiveBetRow): string {
  if (bet.bet_type === "exact_score") {
    const parsed = parseExactScoreSelection(bet.selection);
    if (parsed) {
      return `Score ${formatExactScoreSelection(parsed.home, parsed.away)}`;
    }
    return "Score exact";
  }
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

const STATUS_BADGE: Partial<
  Record<BetStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>
> = {
  won: { label: "Gagné", variant: "default" },
  lost: { label: "Perdu", variant: "destructive" },
  pending: { label: "En cours", variant: "secondary" },
};

interface MatchLiveBetsProps {
  bets: MatchLiveBetRow[];
  currentUserId: string;
  isGoldenMatch?: boolean;
  /** Liste complète sans mise en avant « vous » (panneau admin). */
  adminView?: boolean;
}

export function MatchLiveBets({
  bets,
  currentUserId,
  isGoldenMatch = false,
  adminView = false,
}: MatchLiveBetsProps) {
  if (bets.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-sm font-medium text-primary">Paris révélés</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun pari enregistré sur ce match pour le moment.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        {!adminView && (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Paris des joueurs</h2>
              <Badge className="text-[10px]">Public</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Visibles pour tous après le coup d&apos;envoi — pronostic et points
              potentiels (selon la cote).
            </p>
          </>
        )}
      </div>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card">
        {bets.map((bet) => {
          const isYou = !adminView && bet.user_id === currentUserId;
          const statusInfo = STATUS_BADGE[bet.status];
          return (
            <li
              key={bet.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {playerName(bet)}
                  {isAiPlayer(bet.user_id) && <AiPlayerBadge />}
                  {isYou && (
                    <span className="text-xs font-normal text-primary">
                      (vous)
                    </span>
                  )}
                  {statusInfo && bet.status !== "pending" && (
                    <Badge variant={statusInfo.variant} className="text-[10px]">
                      {statusInfo.label}
                    </Badge>
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
                      isGoldenMatch,
                    ),
                  )}{" "}
                  pts
                  {(bet.is_boosted || isGoldenMatch) && (
                    <span className="ml-1 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                      {bet.is_boosted && isGoldenMatch
                        ? "Boost×2 · Golden×2"
                        : bet.is_boosted
                          ? "Boost×2"
                          : "Golden×2"}
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
