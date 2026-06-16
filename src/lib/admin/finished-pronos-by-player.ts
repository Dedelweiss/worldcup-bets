import { requireAdmin } from "@/lib/auth-server";
import {
  matchResultSelectionLabelLong,
} from "@/lib/bets/match-result-copy";
import {
  fetchFunMarketSnippets,
  resolveFunMarketId,
} from "@/lib/bets/fun-market-lookup";
import { normalizeMatch } from "@/lib/matches";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BetStatus, BetType, ScorePrecision } from "@/types/database";

export interface AdminFinishedPronoRow {
  id: string;
  matchId: number;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  isGoldenMatch: boolean;
  betType: BetType;
  selection: Record<string, unknown>;
  selectionLabel: string;
  odd: number;
  potentialPayout: number;
  isBoosted: boolean;
  status: BetStatus;
  scorePrecision: ScorePrecision | null;
  placedAt: string;
  settledAt: string | null;
}

export interface AdminPlayerFinishedPronos {
  userId: string;
  label: string;
  username: string | null;
  pronos: AdminFinishedPronoRow[];
}

function betSelectionLabel(
  betType: BetType,
  selection: Record<string, unknown>,
  funQuestion: string | null,
  homeTeamName: string,
  awayTeamName: string,
): string {
  if (betType === "exact_score") {
    const home = selection.home;
    const away = selection.away;
    if (typeof home === "number" && typeof away === "number") {
      return `Score ${home}-${away}`;
    }
    return "Score exact";
  }
  if (betType === "fun") {
    const out = String(selection.outcome ?? "");
    const labels: Record<string, string> = {
      yes: "Oui",
      no: "Non",
    };
    const pick = labels[out] ?? out;
    return funQuestion ? `${funQuestion} — ${pick}` : `Fun — ${pick}`;
  }
  const sel = selection.selection;
  if (sel === "home" || sel === "draw" || sel === "away") {
    return matchResultSelectionLabelLong(sel, homeTeamName, awayTeamName);
  }
  return String(sel ?? "—");
}

export async function getFinishedPronosByPlayer(): Promise<
  AdminPlayerFinishedPronos[]
> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: finishedMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "finished")
    .order("kickoff_at", { ascending: false });

  if (matchesError || !finishedMatches?.length) {
    return [];
  }

  const matchIds = finishedMatches.map((m) => m.id as number);

  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      id,
      user_id,
      match_id,
      bet_type,
      selection,
      odd_at_placement,
      potential_payout,
      is_boosted,
      status,
      score_precision,
      placed_at,
      settled_at,
      market_id,
      fun_market_id,
      profiles (display_name, username),
      match:matches (
        id, kickoff_at, home_score, away_score, is_golden,
        home_team:teams!matches_home_team_id_fkey (name),
        away_team:teams!matches_away_team_id_fkey (name)
      )
    `,
    )
    .in("match_id", matchIds)
    .in("status", ["pending", "won", "lost"])
    .order("placed_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const funIds = data
    .map((row) =>
      resolveFunMarketId({
        bet_type: row.bet_type as string,
        market_id: row.market_id as string | null,
        fun_market_id: row.fun_market_id as string | null,
        selection: row.selection,
      }),
    )
    .filter((id): id is string => id != null);

  const funById = await fetchFunMarketSnippets(supabase, funIds);

  const byPlayer = new Map<string, AdminFinishedPronoRow[]>();

  for (const row of data) {
    const r = row as Record<string, unknown>;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const p = profile as {
      display_name?: string | null;
      username?: string | null;
    } | null;

    const matchRaw = r.match;
    const match = normalizeMatch(
      Array.isArray(matchRaw) ? matchRaw[0] : matchRaw,
    );
    if (!match) continue;

    const funId = resolveFunMarketId({
      bet_type: r.bet_type as string,
      market_id: r.market_id as string | null,
      fun_market_id: r.fun_market_id as string | null,
      selection: r.selection,
    });
    const funQuestion = funId ? (funById.get(funId)?.question ?? null) : null;

    const prono: AdminFinishedPronoRow = {
      id: r.id as string,
      matchId: r.match_id as number,
      kickoffAt: match.kickoff_at,
      homeTeamName: match.home_team.name,
      awayTeamName: match.away_team.name,
      homeScore: match.home_score,
      awayScore: match.away_score,
      isGoldenMatch: Boolean(match.is_golden),
      betType: r.bet_type as BetType,
      selection: (r.selection as Record<string, unknown>) ?? {},
      selectionLabel: betSelectionLabel(
        r.bet_type as BetType,
        (r.selection as Record<string, unknown>) ?? {},
        funQuestion,
        match.home_team.name,
        match.away_team.name,
      ),
      odd: Number(r.odd_at_placement),
      potentialPayout: Number(r.potential_payout),
      isBoosted: Boolean(r.is_boosted),
      status: r.status as BetStatus,
      scorePrecision: (r.score_precision as ScorePrecision | null) ?? null,
      placedAt: r.placed_at as string,
      settledAt: (r.settled_at as string | null) ?? null,
    };

    const userId = r.user_id as string;
    const list = byPlayer.get(userId) ?? [];
    list.push(prono);
    byPlayer.set(userId, list);
  }

  const groups: AdminPlayerFinishedPronos[] = [];

  for (const [userId, pronos] of byPlayer) {
    const sample = data.find((r) => (r as { user_id: string }).user_id === userId);
    const profile = sample
      ? (Array.isArray((sample as { profiles: unknown }).profiles)
          ? (sample as { profiles: unknown[] }).profiles[0]
          : (sample as { profiles: unknown }).profiles)
      : null;
    const p = profile as {
      display_name?: string | null;
      username?: string | null;
    } | null;

    groups.push({
      userId,
      label: getPlayerLabel({
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
      }),
      username: p?.username ?? null,
      pronos: pronos.sort(
        (a, b) =>
          new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime(),
      ),
    });
  }

  groups.sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return groups;
}
