import { normalizeMatch } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";
import type { BetStatus, BetType } from "@/types/database";

export type PointsHistoryEventKind = "start" | "win" | "loss" | "adjustment";

export interface PointsHistoryPoint {
  at: string;
  points: number;
  delta: number;
  label: string;
  kind: PointsHistoryEventKind;
}

type TimelineEvent = {
  at: string;
  delta: number;
  label: string;
  kind: Exclude<PointsHistoryEventKind, "start">;
};

function matchLabel(home?: string | null, away?: string | null): string {
  if (home && away) return `${home} – ${away}`;
  return "Match";
}

function betEventLabel(
  betType: BetType,
  status: BetStatus,
  home?: string | null,
  away?: string | null,
  funQuestion?: string | null,
  scorePrecision?: string | null,
): string {
  const match = matchLabel(home, away);
  if (betType === "fun") {
    const q = funQuestion ? ` · ${funQuestion}` : "";
    return status === "won"
      ? `Pari fun gagné${q}`
      : `Pari fun perdu${q}`;
  }
  if (betType === "exact_score") {
    if (status === "won" && scorePrecision === "exact") {
      return `Tout pile · ${match}`;
    }
    if (status === "won" && scorePrecision === "tendance") {
      return `Tendance · ${match}`;
    }
    if (status === "won") {
      return `Score exact · ${match}`;
    }
    return `Score exact raté · ${match}`;
  }
  return status === "won" ? `Victoire · ${match}` : `Défaite · ${match}`;
}

function buildTimeline(events: TimelineEvent[]): PointsHistoryPoint[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  if (sorted.length === 0) {
    return [
      {
        at: new Date().toISOString(),
        points: 0,
        delta: 0,
        label: "Départ",
        kind: "start",
      },
    ];
  }

  const firstAt = sorted[0]!.at;
  const startAt = new Date(new Date(firstAt).getTime() - 60_000).toISOString();

  const out: PointsHistoryPoint[] = [
    {
      at: startAt,
      points: 0,
      delta: 0,
      label: "Départ",
      kind: "start",
    },
  ];

  let running = 0;
  for (const ev of sorted) {
    running = Math.max(0, running + ev.delta);
    out.push({
      at: ev.at,
      points: running,
      delta: ev.delta,
      label: ev.label,
      kind: ev.kind,
    });
  }

  return out;
}

export async function getPointsHistory(
  userId: string,
  currentPoints: number,
): Promise<PointsHistoryPoint[]> {
  const supabase = await createClient();

  const [betsRes, txRes] = await Promise.all([
    supabase
      .from("bets")
      .select(
        `
        bet_type, status, potential_payout, score_precision, settled_at,
        match:matches (
          home_team:teams!matches_home_team_id_fkey (name),
          away_team:teams!matches_away_team_id_fkey (name)
        ),
        fun_market:fun_markets (question)
      `,
      )
      .eq("user_id", userId)
      .in("status", ["won", "lost"])
      .not("settled_at", "is", null)
      .order("settled_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("type, amount, balance_after, created_at, metadata")
      .eq("user_id", userId)
      .eq("type", "admin_adjustment")
      .order("created_at", { ascending: true }),
  ]);

  const events: TimelineEvent[] = [];

  for (const row of betsRes.data ?? []) {
    const r = row as Record<string, unknown>;
    const settledAt = r.settled_at as string;
    const status = r.status as BetStatus;
    const betType = r.bet_type as BetType;
    const payout = Number(r.potential_payout ?? 0);
    const matchRaw = r.match;
    const match = Array.isArray(matchRaw)
      ? matchRaw[0]
      : (matchRaw as Record<string, unknown> | null);
    const normalized = match ? normalizeMatch(match) : null;
    const funRaw = r.fun_market;
    const fun = Array.isArray(funRaw) ? funRaw[0] : funRaw;
    const funQuestion =
      fun && typeof fun === "object" && "question" in fun
        ? String((fun as { question: string }).question)
        : null;

    const home = normalized?.home_team?.name;
    const away = normalized?.away_team?.name;

    events.push({
      at: settledAt,
      delta: status === "won" ? payout : 0,
      label: betEventLabel(
        betType,
        status,
        home,
        away,
        funQuestion,
        r.score_precision as string | null,
      ),
      kind: status === "won" ? "win" : "loss",
    });
  }

  for (const row of txRes.data ?? []) {
    const amount = Number(row.amount ?? 0);
    const note =
      row.metadata &&
      typeof row.metadata === "object" &&
      "note" in row.metadata
        ? String((row.metadata as { note?: string }).note ?? "")
        : "";
    events.push({
      at: row.created_at as string,
      delta: amount,
      label: note ? `Ajustement admin · ${note}` : "Ajustement admin",
      kind: "adjustment",
    });
  }

  const timeline = buildTimeline(events);

  const last = timeline[timeline.length - 1];
  if (last && last.points !== currentPoints) {
    timeline.push({
      at: new Date().toISOString(),
      points: currentPoints,
      delta: currentPoints - last.points,
      label: "Total actuel",
      kind: "adjustment",
    });
  }

  return timeline;
}

/** Données de démo pour le mode sans Supabase. */
export function getMockPointsHistory(currentPoints: number): PointsHistoryPoint[] {
  const base = new Date("2026-06-12T22:00:00Z");
  const d = (days: number, hours = 0) =>
    new Date(base.getTime() + days * 86_400_000 + hours * 3_600_000).toISOString();

  return [
    { at: d(0, -1), points: 0, delta: 0, label: "Départ", kind: "start" },
    { at: d(0), points: 21, delta: 21, label: "Victoire · Mexique – Afrique du Sud", kind: "win" },
    { at: d(1), points: 21, delta: 0, label: "Défaite · France – Belgique", kind: "loss" },
    { at: d(2), points: 52, delta: 31, label: "Score exact · Brésil – Serbie", kind: "win" },
    { at: d(3), points: 68, delta: 16, label: "Pari fun gagné · But avant la 30e", kind: "win" },
    {
      at: new Date().toISOString(),
      points: currentPoints,
      delta: Math.max(0, currentPoints - 68),
      label: "Total actuel",
      kind: "adjustment",
    },
  ];
}
