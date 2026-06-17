import { notFound } from "next/navigation";
import { BetSlip } from "@/components/bets/bet-slip";
import { TackleIncomingAlert } from "@/components/bets/tackle-incoming-alert";
import { MarkFunBetsSeen } from "@/components/fun-bets/mark-fun-bets-seen";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { MatchChat } from "@/components/matches/match-chat";
import { MatchGazette } from "@/components/matches/match-gazette";
import { HashAnchorScroller } from "@/components/layout/hash-anchor-scroller";
import { MatchFunBetsSection } from "@/components/matches/match-fun-bets-section";
import { MatchPageHero } from "@/components/matches/match-page-hero";
import { MatchPageNav, type MatchPageNavTab } from "@/components/matches/match-page-nav";
import { MatchParticipation } from "@/components/matches/match-participation";
import { PreMatchAssistant } from "@/components/matches/pre-match-assistant";
import { MatchFinishedPronos } from "@/components/matches/match-finished-pronos";
import { MatchLivePronos } from "@/components/matches/match-live-pronos";
import { requireAuth } from "@/lib/auth-server";
import { canRevealPlayerBets } from "@/lib/bets/can-reveal-player-bets";
import { getMatchBettingParticipation } from "@/lib/bets/match-participation";
import { getMatchTackleState } from "@/lib/bets/match-tackle";
import { getFunMarketParticipation } from "@/lib/bets/fun-market-participation";
import { isFunMarketBettingOpen } from "@/lib/bets/fun-market-betting";
import { getMatchUserFunBets } from "@/lib/bets/match-user-fun-bets";
import { getMatchRevealedBets } from "@/lib/bets/match-live-bets";
import { getMatchUserPendingBets } from "@/lib/bets/match-user-bets";
import { getPreMatchInsights } from "@/lib/bets/pre-match-insights";
import { hasKickoffStarted } from "@/lib/format";
import { getFunMarketsByMatch } from "@/lib/fun-markets";
import { getMatchComments } from "@/lib/match-comments";
import { getMatchById } from "@/lib/matches";
import { cn } from "@/lib/utils";

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
  const showLivePronosBoard = isLive && canReveal;
  const showFinishedPronosBoard =
    isFinished && canReveal && profile.role === "admin";
  const isPreMatch = match.status === "scheduled" && !kickoffStarted;

  const adminEditHref =
    profile.role === "admin" ? `/admin/matches/${matchId}` : undefined;

  const [funMarkets, comments, pendingBets, funBetsByMarket, funParticipationByMarket, participation, tackleState, preMatchInsights, revealedBets] =
    await Promise.all([
      getFunMarketsByMatch(matchId),
      !isFinished && (kickoffStarted || canReveal)
        ? getMatchComments(matchId)
        : Promise.resolve([]),
      getMatchUserPendingBets(matchId, profile.id),
      getMatchUserFunBets(matchId, profile.id),
      getFunMarketParticipation(matchId),
      getMatchBettingParticipation(matchId),
      getMatchTackleState(matchId, profile.id, match.stage),
      !kickoffStarted && match.status === "scheduled"
        ? getPreMatchInsights(match, profile.id)
        : Promise.resolve(null),
      showLivePronosBoard || showFinishedPronosBoard
        ? getMatchRevealedBets(matchId)
        : Promise.resolve([]),
    ]);

  const hasFunSection = funMarkets.length > 0;
  const hasClassicBet =
    pendingBets.hasMatchResult || pendingBets.hasExactScore;
  const openFunCount = funMarkets.filter((m) =>
    isFunMarketBettingOpen(m, match),
  ).length;
  const unplayedOpenFun = funMarkets.filter(
    (m) =>
      isFunMarketBettingOpen(m, match) && !funBetsByMarket.has(m.id),
  ).length;
  const incomingTackles = tackleState.incomingTackles;

  const sectionScrollClass = "scroll-mt-28 md:scroll-mt-32";

  const navTabs: MatchPageNavTab[] = [];

  if (showLivePronosBoard || showFinishedPronosBoard) {
    navTabs.push({ id: "pronostics-joueurs", label: "Pronos" });
  }

  if (!isFinished && (kickoffStarted || canReveal)) {
    navTabs.push({ id: "chambrages", label: "Chambrage" });
  }

  navTabs.push({
    id: "mon-pronostic",
    label: "Mon pronostic",
    dot: isPreMatch && !hasClassicBet,
  });

  if (hasFunSection) {
    navTabs.push({
      id: "paris-fun",
      label: "Paris fun",
      badge: unplayedOpenFun > 0 ? unplayedOpenFun : openFunCount || undefined,
      pulse: unplayedOpenFun > 0,
    });
  }

  if (!canReveal && (participation.bettors.length > 0 || participation.pending.length > 0)) {
    navTabs.push({ id: "participation", label: "Qui a parié ?" });
  }

  if (preMatchInsights) {
    navTabs.push({ id: "assistant", label: "Assistant" });
  }

  if (match.ai_summary) {
    navTabs.push({ id: "gazette", label: "Gazette" });
  }

  const incomingTackleAlert =
    incomingTackles.length > 0 ? (
      <TackleIncomingAlert tackles={incomingTackles} />
    ) : null;

  const betSlip = (
    <BetSlip
      match={match}
      points={profile.points}
      boostsAvailable={profile.boosts_available ?? 0}
      pending={pendingBets}
      currentUserId={profile.id}
      participation={participation.bettors}
      tackleState={tackleState}
      layout={isPreMatch ? "prominent" : "default"}
    />
  );

  const participationSection =
    !canReveal ? (
      <section id="participation" className={sectionScrollClass}>
        <MatchParticipation
          bettors={participation.bettors}
          pending={participation.pending}
          currentUserId={profile.id}
        />
      </section>
    ) : null;

  const assistantSection = preMatchInsights ? (
    <section id="assistant" className={sectionScrollClass}>
      <PreMatchAssistant match={match} insights={preMatchInsights} />
    </section>
  ) : null;

  const sidebarRail =
    participationSection || assistantSection ? (
      <div className="min-w-0 space-y-4 lg:sticky lg:top-28 lg:self-start">
        {participationSection}
        {assistantSection}
      </div>
    ) : null;

  const funBetsSection = hasFunSection ? (
    <MatchFunBetsSection
      markets={funMarkets}
      match={match}
      funBetsByMarket={funBetsByMarket}
      funParticipationByMarket={funParticipationByMarket}
      currentUserId={profile.id}
      isGoldenMatch={match.is_golden ?? false}
    />
  ) : null;

  const matchStream = (
    <>
      {match.ai_summary && (
        <section id="gazette" className={sectionScrollClass}>
          <MatchGazette summary={match.ai_summary} />
        </section>
      )}

      {showFinishedPronosBoard && (
        <section id="pronostics-joueurs" className={sectionScrollClass}>
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

      {showLivePronosBoard && (
        <section id="pronostics-joueurs" className={sectionScrollClass}>
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
        <section id="chambrages" className={sectionScrollClass}>
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
    <div className="flex w-full flex-col gap-6">
      <HashAnchorScroller />
      <MarkFunBetsSeen matchId={matchId} />
      {(match.status === "live" || kickoffStarted) && <LiveStatusPoller />}

      <MatchPageHero
        match={match}
        adminEditHref={adminEditHref}
        showBetCta={isPreMatch && !hasClassicBet}
        showCountdown={isPreMatch}
      />

      <MatchPageNav tabs={navTabs} />

      {isPreMatch ? (
        <div className="flex flex-col gap-6">
          <div className="lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] lg:items-start lg:gap-6 xl:gap-8">
            <section
              id="mon-pronostic"
              className={cn(sectionScrollClass, "min-w-0 space-y-4")}
            >
              {incomingTackleAlert}
              {betSlip}
            </section>
            {sidebarRail}
          </div>
          {funBetsSection}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section
            id="mon-pronostic"
            className={cn(
              sectionScrollClass,
              "mx-auto w-full max-w-2xl space-y-4",
            )}
          >
            {incomingTackleAlert}
            {betSlip}
          </section>

          {funBetsSection}

          <div className="flex flex-col gap-6">
            {!canReveal && sidebarRail}
            {matchStream}
          </div>
        </div>
      )}
    </div>
  );
}
