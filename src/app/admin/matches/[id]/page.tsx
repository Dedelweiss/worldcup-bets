import { notFound } from "next/navigation";
import { FunMarketsAdmin } from "@/components/admin/fun-markets-admin";
import { MatchAdminPanel } from "@/components/admin/match-admin-panel";
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

  const [pendingBetsCount, pendingClassicBetsCount] = await Promise.all([
    getPendingBetsCount(matchId),
    getPendingClassicBetsCount(matchId),
  ]);
  const funMarkets = await getFunMarketsForAdmin(matchId);

  return (
    <div className="space-y-8">
      <MatchAdminPanel
        match={match}
        pendingBetsCount={pendingBetsCount}
        pendingClassicBetsCount={pendingClassicBetsCount}
      />
      <FunMarketsAdmin matchId={matchId} markets={funMarkets} />
    </div>
  );
}
