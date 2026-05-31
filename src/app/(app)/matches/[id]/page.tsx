import { notFound } from "next/navigation";
import { BetSlip } from "@/components/bets/bet-slip";
import { FunBetSlip } from "@/components/bets/fun-bet-slip";
import { MarkFunBetsSeen } from "@/components/fun-bets/mark-fun-bets-seen";
import { MatchHeader } from "@/components/matches/match-header";
import { MatchLiveBets } from "@/components/matches/match-live-bets";
import { requireAuth } from "@/lib/auth-server";
import { getMatchLiveBets } from "@/lib/bets/match-live-bets";
import { getFunMarketsByMatch } from "@/lib/fun-markets";
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

  const adminEditHref =
    profile.role === "admin" ? `/admin/matches/${matchId}` : undefined;

  const [funMarkets, liveBets] = await Promise.all([
    getFunMarketsByMatch(matchId),
    match.status === "live" ? getMatchLiveBets(matchId) : Promise.resolve([]),
  ]);

  const openFunMarkets = funMarkets.filter((m) => m.status === "open");

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <MarkFunBetsSeen matchId={matchId} />
      <MatchHeader match={match} adminEditHref={adminEditHref} />

      {match.status === "live" && (
        <MatchLiveBets bets={liveBets} currentUserId={profile.id} />
      )}

      <BetSlip
        match={match}
        points={profile.points}
        boostsAvailable={profile.boosts_available ?? 0}
      />

      {(funMarkets.length > 0 || openFunMarkets.length > 0) && (
        <section id="paris-fun" className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Paris fun</h2>
            <p className="text-sm text-muted-foreground">
              Ouverts pendant le match jusqu&apos;à clôture par l&apos;admin
            </p>
          </div>
          <div className="space-y-3">
            {funMarkets.map((market) => (
              <FunBetSlip key={market.id} market={market} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
