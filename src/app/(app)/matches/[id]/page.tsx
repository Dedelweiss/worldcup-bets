import { notFound } from "next/navigation";
import { BetSlip } from "@/components/bets/bet-slip";
import { FunBetSlip } from "@/components/bets/fun-bet-slip";
import { MarkFunBetsSeen } from "@/components/fun-bets/mark-fun-bets-seen";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { MatchChat } from "@/components/matches/match-chat";
import { MatchGazette } from "@/components/matches/match-gazette";
import { MatchHeader } from "@/components/matches/match-header";
import { MatchParticipation } from "@/components/matches/match-participation";
import { MatchPlayerPronos } from "@/components/matches/match-player-pronos";
import { MatchScoreboard } from "@/components/matches/match-scoreboard";
import { requireAuth } from "@/lib/auth-server";
import { canRevealPlayerBets } from "@/lib/bets/can-reveal-player-bets";
import { getMatchBettingParticipation } from "@/lib/bets/match-participation";
import { getMatchTackleState } from "@/lib/bets/match-tackle";
import { getMatchUserFunBets } from "@/lib/bets/match-user-fun-bets";
import { getMatchUserPendingBets } from "@/lib/bets/match-user-bets";
import { getPreMatchInsights } from "@/lib/bets/pre-match-insights";
import { hasKickoffStarted } from "@/lib/format";
import { getFunMarketsByMatch } from "@/lib/fun-markets";
import { getMatchComments } from "@/lib/match-comments";
import { getMatchById } from "@/lib/matches";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatchById(Number(id));
  if (!match) return { title: "Match · WC2026 Pool" };
  return {
    title: `${match.home_team.name} vs ${match.away_team.name} · WC2026 Pool`,
  };
}

export default async function MatchBetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) notFound();

  const [profile, match] = await Promise.all([
    requireAuth(),
    getMatchById(matchId),
  ]);
  if (!match) notFound();

  const kickoffStarted = hasKickoffStarted(match.kickoff_at);
  const canReveal = canRevealPlayerBets(match);

  const adminEditHref =
    profile.role === "admin" ? `/admin/matches/${matchId}` : undefined;

  const [funMarkets, comments, pendingBets, funBetsByMarket, participation, tackleState, preMatchInsights] =
    await Promise.all([
      getFunMarketsByMatch(matchId),
      kickoffStarted || canReveal ? getMatchComments(matchId) : Promise.resolve([]),
      getMatchUserPendingBets(matchId, profile.id),
      getMatchUserFunBets(matchId, profile.id),
      getMatchBettingParticipation(matchId),
      getMatchTackleState(matchId, profile.id, match.stage),
      !kickoffStarted && match.status === "scheduled"
        ? getPreMatchInsights(match, profile.id)
        : Promise.resolve(null),
    ]);

  const hasFunSection = funMarkets.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <MarkFunBetsSeen matchId={matchId} />
      {(match.status === "live" || kickoffStarted) && <LiveStatusPoller />}

      <MatchHeader match={match} adminEditHref={adminEditHref} />

      <section id="score" className="scroll-mt-20">
        <MatchScoreboard match={match} />
      </section>

      <section id="mon-pronostic" className="scroll-mt-20">
        <BetSlip
          match={match}
          points={profile.points}
          boostsAvailable={profile.boosts_available ?? 0}
          pending={pendingBets}
          currentUserId={profile.id}
          participation={participation.bettors}
          tackleState={tackleState}
          preMatchInsights={preMatchInsights}
        />
      </section>

      {hasFunSection && (
        <section id="paris-fun" className="scroll-mt-20 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Paris fun</h2>
            <p className="text-sm text-muted-foreground">
              Ouverts pendant le match jusqu&apos;à clôture par l&apos;admin
            </p>
          </div>
          <div className="space-y-3">
            {funMarkets.map((market) => (
              <FunBetSlip
                key={market.id}
                market={market}
                isGoldenMatch={match.is_golden ?? false}
                userBet={funBetsByMarket.get(market.id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {!canReveal && (
        <section id="participation" className="scroll-mt-20">
          <MatchParticipation
            bettors={participation.bettors}
            pending={participation.pending}
            currentUserId={profile.id}
          />
        </section>
      )}

      {match.ai_summary && (
        <section id="gazette" className="scroll-mt-20">
          <MatchGazette summary={match.ai_summary} />
        </section>
      )}

      {canReveal && (
        <section id="pronostics-joueurs" className="scroll-mt-20">
          <MatchPlayerPronos
            matchId={matchId}
            bettors={participation.bettors}
            pending={participation.pending}
            currentUserId={profile.id}
            isGoldenMatch={match.is_golden ?? false}
            currentUserPendingBets={pendingBets}
          />
        </section>
      )}

      {(kickoffStarted || canReveal) && (
        <section id="chambrages" className="scroll-mt-20">
          <MatchChat
            matchId={matchId}
            currentUserId={profile.id}
            initialComments={comments}
          />
        </section>
      )}
    </div>
  );
}
