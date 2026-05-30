import { notFound } from "next/navigation";
import { MatchAdminPanel } from "@/components/admin/match-admin-panel";
import { getAdminMatch, getPendingBetsCount } from "@/lib/admin/matches";

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

  const pendingBetsCount = await getPendingBetsCount(matchId);

  return (
    <MatchAdminPanel match={match} pendingBetsCount={pendingBetsCount} />
  );
}
