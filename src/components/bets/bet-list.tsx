import Link from "next/link";
import { Radio, Star } from "lucide-react";
import { BetCancelButton } from "@/components/bets/bet-cancel-button";
import { Badge } from "@/components/ui/badge";
import { BetResultAnimation } from "@/components/bets/bet-result-animation";
import { LiveMatchAnimation } from "@/components/matches/live-match-animation";
import { MatchScoreInline } from "@/components/matches/match-score-inline";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import {
  formatExactScoreSelection,
  parseExactScoreSelection,
  scorePrecisionLabel,
} from "@/lib/exact-score";
import { MATCH_RESULT_OUTCOME } from "@/lib/bets/match-result-copy";
import { formatKickoff, formatOdd, formatPoints } from "@/lib/format";
import { goldenMatchCardClass } from "@/lib/golden-match";
import { canCancelPendingBet } from "@/lib/bets/can-cancel-bet";
import { betDisplayPayout } from "@/lib/points";
import { cn } from "@/lib/utils";
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
  home: `Victoire à domicile`,
  draw: MATCH_RESULT_OUTCOME.draw,
  away: `Victoire à l'extérieur`,
  yes: "Oui",
  no: "Non",
};

function betLabel(bet: BetRow): string {
  if (bet.bet_type === "exact_score") {
    const parsed = parseExactScoreSelection(bet.selection);
    if (parsed) {
      return `Score ${formatExactScoreSelection(parsed.home, parsed.away)}`;
    }
    return "Score exact";
  }
  if (bet.bet_type === "fun" && bet.fun_market?.question) {
    const out = bet.selection?.outcome ?? "";
    return `${bet.fun_market.question} — ${SELECTION_LABEL[out] ?? out}`;
  }
  const sel = bet.selection?.selection ?? "";
  return SELECTION_LABEL[sel] ?? sel;
}

function cardSurfaceClass(bet: BetRow, isLive: boolean): string {
  if (isLive) {
    return cn(
      goldenMatchCardClass(bet.match?.is_golden ?? false, true),
      "border-lime-400/40 hover:border-lime-400/60",
    );
  }
  if (bet.status !== "won" || bet.bet_type !== "exact_score") {
    return "border-border hover:border-primary/40";
  }
  if (bet.score_precision === "exact") {
    return "border-amber-500/50 bg-amber-500/10 shadow-sm shadow-amber-500/10 hover:border-amber-500/70";
  }
  if (bet.score_precision === "tendance") {
    return "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60";
  }
  return "border-border hover:border-primary/40";
}

function BetCard({ bet }: { bet: BetRow }) {
  const match = bet.match;
  const isLive = match?.status === "live";
  const hasScore =
    match?.home_score != null && match?.away_score != null;
  const settled = bet.status === "won" || bet.status === "lost";
  const isExactWin =
    bet.bet_type === "exact_score" &&
    bet.status === "won" &&
    bet.score_precision;
  const cancellable = canCancelPendingBet(bet);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        cardSurfaceClass(bet, isLive),
      )}
    >
    <Link
      href={`/matches/${bet.match_id}${isLive ? "#paris-fun" : ""}`}
      className="block"
    >
      {isLive && (
        <div className="flex items-center justify-between gap-2 border-b border-lime-400/20 bg-lime-400/10 px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="animate-pulse gap-1 border-lime-400/50 bg-lime-400/20 text-[10px] text-lime-300">
              <Radio className="size-3" aria-hidden />
              EN DIRECT
            </Badge>
            {match?.is_golden && <GoldenMatchBadge compact />}
          </div>
          <span className="text-xs font-medium text-lime-400/90">
            Suivre le match →
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {bet.bet_type === "fun" && (
                <Badge variant="outline" className="text-[10px]">
                  Fun
                </Badge>
              )}
              {bet.bet_type === "exact_score" && (
                <Badge variant="outline" className="text-[10px]">
                  Score exact
                </Badge>
              )}
              {isExactWin && bet.score_precision === "tendance" && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/50 bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-300"
                >
                  Tendance
                </Badge>
              )}
              {isExactWin && bet.score_precision === "exact" && (
                <Badge
                  variant="outline"
                  className="gap-0.5 border-amber-500/60 bg-amber-500/20 text-[10px] text-amber-800 dark:text-amber-200"
                >
                  <Star className="size-3 fill-amber-500 text-amber-500" />
                  Tout pile
                </Badge>
              )}
              {bet.is_boosted && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
                >
                  Boost x2
                </Badge>
              )}
              {!isLive && (
                <p
                  className={cn(
                    "font-medium",
                    bet.score_precision === "exact" &&
                      "text-amber-900 dark:text-amber-100",
                    bet.score_precision === "tendance" &&
                      "text-emerald-900 dark:text-emerald-100",
                  )}
                >
                  {match?.home_team?.name && match?.away_team?.name
                    ? `${match.home_team.name} vs ${match.away_team.name}`
                    : `Match #${bet.match_id}`}
                </p>
              )}
            </div>
            {!isLive && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {match?.kickoff_at ? formatKickoff(match.kickoff_at) : "Match"}
              </p>
            )}
          </div>
          {!isLive && (
            <Badge
              variant={STATUS_VARIANT[bet.status]}
              className={cn(
                "shrink-0 text-[10px]",
                bet.score_precision === "exact" &&
                  bet.status === "won" &&
                  "border-amber-500/50 bg-amber-500/25 text-amber-950 dark:text-amber-50",
                bet.score_precision === "tendance" &&
                  bet.status === "won" &&
                  "border-emerald-500/50 bg-emerald-500/20 text-emerald-900 dark:text-emerald-100",
              )}
            >
              {bet.status === "won" && bet.score_precision
                ? scorePrecisionLabel(bet.score_precision)
                : STATUS_LABEL[bet.status]}
            </Badge>
          )}
        </div>

        {isLive && match?.home_team && match?.away_team && (
          <div className="mt-4">
            {hasScore ? (
              <MatchScoreInline
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeScore={match.home_score}
                awayScore={match.away_score}
                isLive
                size="sm"
              />
            ) : (
              <LiveMatchAnimation
                homeTeam={match.home_team}
                awayTeam={match.away_team}
              />
            )}
          </div>
        )}

        <div
          className={cn(
            "grid grid-cols-2 gap-2 text-sm sm:grid-cols-3",
            isLive ? "mt-4 border-t border-white/10 pt-3" : "mt-3",
          )}
        >
          <div>
            <p className="text-xs text-muted-foreground">Pari</p>
            <p className="font-medium line-clamp-2">{betLabel(bet)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {bet.bet_type === "exact_score" ? "Récompense" : "Cote"}
            </p>
            <p className="font-medium tabular-nums">
              {bet.bet_type === "exact_score" ? (
                <span className="text-xs text-muted-foreground">Précision</span>
              ) : (
                formatOdd(bet.odd_at_placement)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isLive
                ? "Points en jeu"
                : bet.status === "won"
                  ? "Points gagnés"
                  : "Points si gagné"}
            </p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                isLive && "text-lime-400",
                bet.score_precision === "exact"
                  ? "text-amber-600 dark:text-amber-400"
                  : bet.score_precision === "tendance"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : !isLive && "text-primary",
              )}
            >
              +
              {formatPoints(
                bet.bet_type === "exact_score" && bet.status === "pending"
                  ? bet.potential_payout
                  : bet.status === "won" && bet.bet_type === "exact_score"
                    ? bet.potential_payout
                    : betDisplayPayout(
                        bet.potential_payout,
                        bet.is_boosted,
                        bet.match?.is_golden,
                      ),
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
      {cancellable && (
        <div className="border-t border-border/80 bg-muted/20 px-4 py-3">
          <BetCancelButton betId={bet.id} matchId={bet.match_id} />
        </div>
      )}
    </div>
  );
}

function renderBetItem(bet: BetRow) {
  const settled = bet.status === "won" || bet.status === "lost";
  const card = <BetCard bet={bet} />;

  if (settled) {
    return (
      <BetResultAnimation key={bet.id} status={bet.status}>
        {card}
      </BetResultAnimation>
    );
  }

  return <div key={bet.id}>{card}</div>;
}

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

  const liveBets = bets.filter((b) => b.match?.status === "live");
  const otherBets = bets.filter((b) => b.match?.status !== "live");

  return (
    <div className="space-y-6">
      {liveBets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-lime-400" aria-hidden />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-lime-400">
              En direct maintenant
            </h2>
          </div>
          {liveBets.map(renderBetItem)}
        </section>
      )}

      {otherBets.length > 0 && (
        <section className="space-y-3">
          {liveBets.length > 0 && (
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">
              Autres paris
            </h2>
          )}
          {otherBets.map(renderBetItem)}
        </section>
      )}
    </div>
  );
}
