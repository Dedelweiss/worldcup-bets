import { notFound } from "next/navigation";
import { BetSlip } from "@/components/bets/bet-slip";
import { MatchHeader } from "@/components/matches/match-header";
import { requireAuth } from "@/lib/auth-server";
import { canPlaceBetOnMatch, getMatchById } from "@/lib/matches";
import { Card, CardContent } from "@/components/ui/card";

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

  const { allowed, reason } = canPlaceBetOnMatch(match);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <MatchHeader match={match} />

      {allowed ? (
        <BetSlip match={match} balance={profile.balance} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{reason}</p>
            {match.status === "finished" &&
              match.home_score !== null &&
              match.away_score !== null && (
                <p className="mt-2 text-sm">
                  Score final : {match.home_score} - {match.away_score}
                </p>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
