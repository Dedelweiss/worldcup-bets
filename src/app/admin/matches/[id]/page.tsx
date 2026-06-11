import { notFound } from "next/navigation";
import { AdminMatchBetsPanel } from "@/components/admin/admin-match-bets-panel";
import { FunMarketsAdmin } from "@/components/admin/fun-markets-admin";
import { MatchAdminPanel } from "@/components/admin/match-admin-panel";
import { getAdminMatchBets } from "@/lib/admin/match-bets";
import { getAdminMatch, getPendingBetsCount, getPendingClassicBetsCount } from "@/lib/admin/matches";
import { getFunMarketsForAdmin } from "@/lib/fun-markets";

export const metadata = { title: "Admin · Détail match" };

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) notFound();

  const match = await getAdminMatch(matchId);
  if (!match) notFound();

  const showBets =
    match.status === "live" || match.status === "finished";

  const [pendingBetsCount, pendingClassicBetsCount, funMarkets, bets] =
    await Promise.all([
      getPendingBetsCount(matchId),
      getPendingClassicBetsCount(matchId),
      getFunMarketsForAdmin(matchId),
      showBets ? getAdminMatchBets(matchId) : Promise.resolve([]),
    ]);

  return (
    <div className="space-y-8">
      <MatchAdminPanel
        match={match}
        pendingBetsCount={pendingBetsCount}
        pendingClassicBetsCount={pendingClassicBetsCount}
      />
      {showBets && (
        <AdminMatchBetsPanel
          matchId={matchId}
          matchStatus={match.status}
          isGoldenMatch={match.is_golden ?? false}
          bets={bets}
        />
      )}
      <FunMarketsAdmin matchId={matchId} markets={funMarkets} />
    </div>
  );
}
