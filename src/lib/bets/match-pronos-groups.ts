import type { MatchLiveBetRow } from "@/lib/bets/match-live-bets";
import { resolveEffectiveClassicOutcome } from "@/lib/bets/bet-display-points";
import {
  impliedMatchResult,
  parseExactScoreSelection,
} from "@/lib/exact-score";
import { isAiPlayer } from "@/lib/ai/constants";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import type { BetStatus, MatchResultSelection, MatchStatus } from "@/types/database";

export interface PlayerPronoGroup {
  userId: string;
  label: string;
  initials: string;
  avatarUrl: string | null;
  isAi: boolean;
  classicBets: MatchLiveBetRow[];
  funBets: MatchLiveBetRow[];
  impliedOutcome: MatchResultSelection | null;
  bestStatus: BetStatus;
  liveTone: "winning" | "losing" | "neutral";
}

export interface PendingPlayerRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_ai?: boolean;
}

export function betOutcome(bet: MatchLiveBetRow): MatchResultSelection | null {
  if (bet.bet_type === "match_result") {
    const sel = bet.selection?.selection;
    if (sel === "home" || sel === "draw" || sel === "away") return sel;
    return null;
  }
  if (bet.bet_type === "exact_score") {
    const parsed = parseExactScoreSelection(bet.selection);
    if (!parsed) return null;
    return impliedMatchResult(parsed.home, parsed.away);
  }
  return null;
}

export function statusRank(status: BetStatus): number {
  if (status === "won") return 0;
  if (status === "pending") return 1;
  return 2;
}

function compareClassicBets(a: MatchLiveBetRow, b: MatchLiveBetRow): number {
  const statusDiff = statusRank(a.status) - statusRank(b.status);
  if (statusDiff !== 0) return statusDiff;
  if (a.bet_type === "match_result" && b.bet_type !== "match_result") return -1;
  if (b.bet_type === "match_result" && a.bet_type !== "match_result") return 1;
  return 0;
}

function resolveLiveTone(
  classicBets: MatchLiveBetRow[],
  match: {
    status: MatchStatus;
    home_score: number | null;
    away_score: number | null;
    is_golden?: boolean | null;
  },
): "winning" | "losing" | "neutral" {
  if (match.status !== "live" || classicBets.length === 0) return "neutral";
  if (match.home_score == null || match.away_score == null) return "neutral";

  for (const bet of classicBets) {
    const outcome = resolveEffectiveClassicOutcome(bet, match);
    if (outcome === "won") return "winning";
    if (outcome === "lost") return "losing";
  }

  return "neutral";
}

export function groupBetsByPlayer(
  bets: MatchLiveBetRow[],
  currentUserId: string,
  match: {
    status: MatchStatus;
    home_score: number | null;
    away_score: number | null;
    is_golden?: boolean | null;
  },
): PlayerPronoGroup[] {
  const byUser = new Map<string, MatchLiveBetRow[]>();
  for (const bet of bets) {
    const list = byUser.get(bet.user_id) ?? [];
    list.push(bet);
    byUser.set(bet.user_id, list);
  }

  const groups: PlayerPronoGroup[] = [];

  for (const [userId, userBets] of byUser) {
    const classicBets = userBets
      .filter((b) => b.bet_type === "match_result" || b.bet_type === "exact_score")
      .sort(compareClassicBets);
    const funBets = userBets.filter((b) => b.bet_type === "fun");
    const sample = classicBets[0] ?? userBets[0]!;
    const primaryClassic = classicBets[0];
    const impliedOutcome = primaryClassic ? betOutcome(primaryClassic) : null;
    const bestStatus = userBets.reduce<BetStatus>(
      (best, b) => (statusRank(b.status) < statusRank(best) ? b.status : best),
      "lost",
    );

    groups.push({
      userId,
      label: getPlayerLabel(sample),
      initials: getPlayerInitials(sample),
      avatarUrl: sample.avatar_url,
      isAi: isAiPlayer(userId),
      classicBets,
      funBets,
      impliedOutcome,
      bestStatus,
      liveTone: resolveLiveTone(classicBets, match),
    });
  }

  return groups.sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    const statusDiff = statusRank(a.bestStatus) - statusRank(b.bestStatus);
    if (statusDiff !== 0) return statusDiff;
    return a.label.localeCompare(b.label, "fr");
  });
}
