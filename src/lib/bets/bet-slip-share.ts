import { formatOdd, formatPoints } from "@/lib/format";
import { betDisplayPayout } from "@/lib/points";
import { MATCH_RESULT_OUTCOME } from "@/lib/bets/match-result-copy";
import {
  formatExactScoreSelection,
  parseExactScoreSelection,
} from "@/lib/exact-score";
import type { BetRow } from "@/types/database";

export interface BetSlipShareLine {
  id: string;
  matchLabel: string;
  pickLabel: string;
  oddLabel: string;
  pointsLabel: string;
  isLive: boolean;
}

const RESULT_LABEL: Record<string, string> = {
  home: "Victoire dom.",
  draw: MATCH_RESULT_OUTCOME.draw,
  away: "Victoire ext.",
};

function betPickLabel(bet: BetRow): string {
  if (bet.bet_type === "exact_score") {
    const parsed = parseExactScoreSelection(bet.selection);
    if (parsed) {
      return `Score ${formatExactScoreSelection(parsed.home, parsed.away)}`;
    }
    return "Score exact";
  }
  if (bet.bet_type === "fun" && bet.fun_market?.question) {
    const out = bet.selection?.outcome ?? "";
    return `${bet.fun_market.question} — ${out === "yes" ? "Oui" : out === "no" ? "Non" : out}`;
  }
  const sel = bet.selection?.selection ?? "";
  return RESULT_LABEL[sel] ?? String(sel);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Jusqu'à 5 paris pending à partager (priorité : live, puis du jour, puis prochains). */
export function selectBetsForSlipShare(bets: BetRow[]): BetRow[] {
  const pending = bets.filter((b) => b.status === "pending" && b.match);
  const now = new Date();

  const sorted = [...pending].sort((a, b) => {
    const liveA = a.match?.status === "live" ? 0 : 1;
    const liveB = b.match?.status === "live" ? 0 : 1;
    if (liveA !== liveB) return liveA - liveB;

    const dayA =
      a.match?.kickoff_at && isSameCalendarDay(new Date(a.match.kickoff_at), now)
        ? 0
        : 1;
    const dayB =
      b.match?.kickoff_at && isSameCalendarDay(new Date(b.match.kickoff_at), now)
        ? 0
        : 1;
    if (dayA !== dayB) return dayA - dayB;

    const ka = a.match?.kickoff_at ? new Date(a.match.kickoff_at).getTime() : 0;
    const kb = b.match?.kickoff_at ? new Date(b.match.kickoff_at).getTime() : 0;
    return ka - kb;
  });

  return sorted.slice(0, 5);
}

export function mapBetsToShareLines(bets: BetRow[]): BetSlipShareLine[] {
  return bets.map((bet) => {
    const match = bet.match!;
    const home = match.home_team?.name ?? "Domicile";
    const away = match.away_team?.name ?? "Extérieur";

    return {
      id: bet.id,
      matchLabel: `${home} vs ${away}`,
      pickLabel: betPickLabel(bet),
      oddLabel:
        bet.bet_type === "exact_score"
          ? "Précision"
          : formatOdd(bet.odd_at_placement),
      pointsLabel: `+${formatPoints(
        betDisplayPayout(
          bet.potential_payout,
          bet.is_boosted,
          match.is_golden,
        ),
      )}`,
      isLive: match.status === "live",
    };
  });
}

export function betSlipExportFilename(playerName: string): string {
  const slug = playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .toLowerCase();
  return `wc2026-slip-${slug || "joueur"}.png`;
}
