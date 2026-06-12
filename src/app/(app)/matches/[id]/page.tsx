import { notFound } from "next/navigation";
import { BetSlip } from "@/components/bets/bet-slip";
import { FunBetSlip } from "@/components/bets/fun-bet-slip";
import { MarkFunBetsSeen } from "@/components/fun-bets/mark-fun-bets-seen";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { MatchChat } from "@/components/matches/match-chat";
import { MatchGazette } from "@/components/matches/match-gazette";
import { HashAnchorScroller } from "@/components/layout/hash-anchor-scroller";
import { MatchPageHero } from "@/components/matches/match-page-hero";
import { MatchParticipation } from "@/components/matches/match-participation";
import { MatchFinishedPronos } from "@/components/matches/match-finished-pronos";
import { MatchLivePronos } from "@/components/matches/match-live-pronos";
import { requireAuth } from "@/lib/auth-server";
import { canRevealPlayerBets } from "@/lib/bets/can-reveal-player-bets";
import { getMatchBettingParticipation } from "@/lib/bets/match-participation";
import { getMatchTackleState } from "@/lib/bets/match-tackle";
import { getMatchUserFunBets } from "@/lib/bets/match-user-fun-bets";
import { getMatchRevealedBets } from "@/lib/bets/match-live-bets";
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
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const showPronosBoard = canReveal && (isFinished || isLive);
  const isPreMatch = match.status === "scheduled" && !kickoffStarted;

  const adminEditHref =
    profile.role === "admin" ? `/admin/matches/${matchId}` : undefined;

  const [funMarkets, comments, pendingBets, funBetsByMarket, participation, tackleState, preMatchInsights, revealedBets] =
    await Promise.all([
      getFunMarketsByMatch(matchId),
      !isFinished && (kickoffStarted || canReveal)
        ? getMatchComments(matchId)
        : Promise.resolve([]),
      getMatchUserPendingBets(matchId, profile.id),
      getMatchUserFunBets(matchId, profile.id),
      getMatchBettingParticipation(matchId),
      getMatchTackleState(matchId, profile.id, match.stage),
      !kickoffStarted && match.status === "scheduled"
        ? getPreMatchInsights(match, profile.id)
        : Promise.resolve(null),
      showPronosBoard ? getMatchRevealedBets(matchId) : Promise.resolve([]),
    ]);

  const hasFunSection = funMarkets.length > 0;

  const betSlip = (
    <BetSlip
      match={match}
      points={profile.points}
      boostsAvailable={profile.boosts_available ?? 0}
      pending={pendingBets}
      currentUserId={profile.id}
      participation={participation.bettors}
      tackleState={tackleState}
      preMatchInsights={preMatchInsights}
      layout={isPreMatch ? "prominent" : "default"}
    />
  );

  const participationSection =
    !canReveal ? (
      <section id="participation" className="scroll-mt-20 md:scroll-mt-24">
        <MatchParticipation
          bettors={participation.bettors}
          pending={participation.pending}
          currentUserId={profile.id}
        />
      </section>
    ) : null;

  const matchStream = (
    <>
      {hasFunSection && (
        <section id="paris-fun" className="scroll-mt-20 md:scroll-mt-24">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Paris fun</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ouverts pendant le match jusqu&apos;à clôture par l&apos;admin
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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

      {match.ai_summary && (
        <section id="gazette" className="scroll-mt-20 md:scroll-mt-24">
          <MatchGazette summary={match.ai_summary} />
        </section>
      )}

      {showPronosBoard && isFinished && (
        <section id="pronostics-joueurs" className="scroll-mt-20 md:scroll-mt-24">
          <MatchFinishedPronos
            bets={revealedBets}
            currentUserId={profile.id}
            isGoldenMatch={match.is_golden ?? false}
            homeTeamName={match.home_team.name}
            awayTeamName={match.away_team.name}
            homeScore={match.home_score}
            awayScore={match.away_score}
            pendingPlayers={participation.pending}
          />
        </section>
      )}

      {showPronosBoard && isLive && (
        <section id="pronostics-joueurs" className="scroll-mt-20 md:scroll-mt-24">
          <MatchLivePronos
            bets={revealedBets}
            currentUserId={profile.id}
            isGoldenMatch={match.is_golden ?? false}
            homeTeamName={match.home_team.name}
            awayTeamName={match.away_team.name}
            homeScore={match.home_score}
            awayScore={match.away_score}
            pendingPlayers={participation.pending}
          />
        </section>
      )}

      {!isFinished && (kickoffStarted || canReveal) && (
        <section id="chambrages" className="scroll-mt-20 md:scroll-mt-24">
          <MatchChat
            matchId={matchId}
            currentUserId={profile.id}
            initialComments={comments}
          />
        </section>
      )}
    </>
  );

  return (
    <div className="w-full space-y-8 md:space-y-10">
      <HashAnchorScroller />
      <MarkFunBetsSeen matchId={matchId} />
      {(match.status === "live" || kickoffStarted) && <LiveStatusPoller />}

      <MatchPageHero match={match} adminEditHref={adminEditHref} />

      {isPreMatch ? (
        <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] lg:items-start lg:gap-8 xl:gap-10">
          <section
            id="mon-pronostic"
            className="scroll-mt-20 min-w-0 md:scroll-mt-24"
          >
            {betSlip}
          </section>
          {participationSection ? (
            <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              {participationSection}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8 md:space-y-10">
          <section
            id="mon-pronostic"
            className="scroll-mt-20 mx-auto w-full max-w-2xl md:scroll-mt-24"
          >
            {betSlip}
          </section>

          <div className="space-y-8 md:space-y-10">
            {!canReveal && participationSection}
            {matchStream}
          </div>
        </div>
      )}
    </div>
  );
}
