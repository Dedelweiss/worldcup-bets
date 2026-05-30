import { requireAuth, hasSupabaseConfig } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Classement · WC2026 Pool" };

export default async function LeaderboardPage() {
  await requireAuth();

  if (!hasSupabaseConfig) {
    const { profile } = MOCK_DASHBOARD;
    return (
      <LeaderboardView
        players={[
          {
            id: profile.id,
            display_name: profile.display_name,
            username: profile.username,
            balance: profile.balance,
          },
        ]}
      />
    );
  }

  const supabase = await createClient();

  const { data: players } = await supabase
    .from("profiles")
    .select("id, display_name, username, balance")
    .order("balance", { ascending: false })
    .limit(50);

  return <LeaderboardView players={players ?? []} />;
}

type LeaderboardPlayer = {
  id: string;
  display_name: string | null;
  username: string | null;
  balance: number;
};

function LeaderboardView({ players }: { players: LeaderboardPlayer[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Classement</h1>
        <p className="text-sm text-muted-foreground">
          Classement global par bankroll virtuelle
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Joueur</th>
              <th className="px-4 py-3 font-medium text-right">Bankroll</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id} className="border-t border-border/60">
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium">
                  {player.display_name ?? player.username ?? "Joueur"}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">
                  {formatCurrency(Number(player.balance))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!players.length && (
          <p className="p-8 text-center text-muted-foreground">
            Aucun joueur inscrit pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
