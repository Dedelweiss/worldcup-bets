import { groq } from "@ai-sdk/groq";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth-server";
import { getUserBets } from "@/lib/bets";
import { estimateCrowdPicksFromOdds } from "@/lib/bets/pre-match-insights";
import { getMatchById } from "@/lib/matches";
import {
  buildAdvisorSystemPrompt,
  type AdvisorMatchContext,
  type AdvisorUserStats,
} from "@/lib/ai/build-advisor-prompt";
import type { BetRow, MatchStage } from "@/types/database";

const STAGE_LABELS: Record<MatchStage, string> = {
  group: "Phase de groupes",
  r32: "32es de finale",
  r16: "Huitièmes de finale",
  qf: "Quarts de finale",
  sf: "Demi-finales",
  third_place: "Match pour la 3e place",
  final: "Finale",
};

function computeUserStats(bets: BetRow[]): AdvisorUserStats | null {
  const classic = bets.filter(
    (b) =>
      (b.bet_type === "match_result" || b.bet_type === "exact_score") &&
      (b.status === "won" || b.status === "lost"),
  );

  if (classic.length === 0) return null;

  const wins = classic.filter((b) => b.status === "won").length;
  const winRate = wins / classic.length;

  const sorted = [...classic].sort(
    (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime(),
  );

  let streakWins = 0;
  for (const bet of sorted) {
    if (bet.status === "won") streakWins++;
    else break;
  }

  const drawBets = classic.filter((b) => {
    if (b.bet_type === "match_result") return b.selection.selection === "draw";
    if (b.bet_type === "exact_score") {
      const h = b.selection.home ?? 0;
      const a = b.selection.away ?? 0;
      return h === a;
    }
    return false;
  });

  const drawSuccessRate =
    drawBets.length >= 3
      ? drawBets.filter((b) => b.status === "won").length / drawBets.length
      : null;

  return { totalBets: classic.length, winRate, streakWins, drawSuccessRate };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  let messages: UIMessage[];
  try {
    const body = (await request.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }
    messages = body.messages as UIMessage[];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const [match, userBets] = await Promise.all([
    getMatchById(matchId, { skipLiveSync: true }),
    getUserBets(profile.id),
  ]);

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const crowd = estimateCrowdPicksFromOdds(match);
  const userStats = computeUserStats(userBets);
  const stageLabel = match.stage ? (STAGE_LABELS[match.stage] ?? match.stage) : "Match";

  const ctx: AdvisorMatchContext = {
    homeTeam: match.home_team.name,
    awayTeam: match.away_team.name,
    oddHome: match.odd_home,
    oddDraw: match.odd_draw,
    oddAway: match.odd_away,
    stage: stageLabel,
    crowdHome: crowd.home,
    crowdDraw: crowd.draw,
    crowdAway: crowd.away,
  };

  const systemPrompt = buildAdvisorSystemPrompt(ctx, userStats);

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: groq("llama-3.1-8b-instant"),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 320,
    temperature: 0.75,
  });

  return result.toUIMessageStreamResponse();
}
