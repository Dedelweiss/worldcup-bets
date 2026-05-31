import { notFound } from "next/navigation";
import { BetSlip } from "@/components/bets/bet-slip";
import { FunBetSlip } from "@/components/bets/fun-bet-slip";
import { MarkFunBetsSeen } from "@/components/fun-bets/mark-fun-bets-seen";
import { MatchChat } from "@/components/matches/match-chat";
import { MatchHeader } from "@/components/matches/match-header";
import { MatchLiveBets } from "@/components/matches/match-live-bets";
import { MatchParticipation } from "@/components/matches/match-participation";
import { MatchScoreboard } from "@/components/matches/match-scoreboard";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { requireAuth } from "@/lib/auth-server";
import { getMatchBettingParticipation } from "@/lib/bets/match-participation";
import { getMatchRevealedBets } from "@/lib/bets/match-live-bets";
import { getMatchUserPendingBets } from "@/lib/bets/match-user-bets";
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
  const profile = await requireAuth();
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) notFound();

  const match = await getMatchById(matchId);
  if (!match) notFound();

  const kickoffStarted = hasKickoffStarted(match.kickoff_at);

  const adminEditHref =
    profile.role === "admin" ? `/admin/matches/${matchId}` : undefined;

  const [funMarkets, revealedBets, comments, pendingBets, participation] =
    await Promise.all([
      getFunMarketsByMatch(matchId),
      kickoffStarted ? getMatchRevealedBets(matchId) : Promise.resolve([]),
      kickoffStarted ? getMatchComments(matchId) : Promise.resolve([]),
      getMatchUserPendingBets(matchId, profile.id),
      getMatchBettingParticipation(matchId),
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
              />
            ))}
          </div>
        </section>
      )}

      <section id="participation" className="scroll-mt-20">
        <MatchParticipation
          bettors={participation.bettors}
          pending={participation.pending}
          totalPlayers={participation.totalPlayers}
          currentUserId={profile.id}
          kickoffStarted={kickoffStarted}
        />
      </section>

      {kickoffStarted && (
        <>
          {revealedBets.length > 0 && (
            <section id="paris-joueurs" className="scroll-mt-20">
              <MatchLiveBets
                bets={revealedBets}
                currentUserId={profile.id}
                isGoldenMatch={match.is_golden ?? false}
              />
            </section>
          )}

          <section id="chambrages" className="scroll-mt-20">
            <MatchChat
              matchId={matchId}
              currentUserId={profile.id}
              initialComments={comments}
            />
          </section>
        </>
      )}
    </div>
  );
}
