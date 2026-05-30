import Link from "next/link";
import { LeagueInvitePanel } from "@/components/leagues/league-invite-panel";
import { requireAuth, hasSupabaseConfig } from "@/lib/auth-server";
import { getLeaguesForUser } from "@/lib/leagues";

export const metadata = { title: "Mes ligues" };

export default async function LeaguesPage() {
  await requireAuth();
  const myLeagues = hasSupabaseConfig ? await getLeaguesForUser() : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes ligues</h1>
          <p className="text-sm text-muted-foreground">
            Rejoignez une ligue avec un code ou créez la vôtre.
          </p>
        </div>
        <Link
          href="/leaderboard?scope=league"
          className="text-sm text-primary hover:underline"
        >
          Voir le classement →
        </Link>
      </div>

      <LeagueInvitePanel myLeagues={myLeagues} />
    </div>
  );
}
