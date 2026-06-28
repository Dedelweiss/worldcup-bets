import { requireAuth } from "@/lib/auth-server";
import { getF1Leaderboard, isF1ModeEnabled } from "@/lib/f1/queries";
import { redirect } from "next/navigation";
import { resolveAvatarUrl } from "@/lib/profile/avatars";

export const metadata = {
  title: "Classement F1 · WC2026 Pool",
};

export default async function F1LeaderboardPage() {
  await requireAuth();
  if (!(await isF1ModeEnabled())) redirect("/dashboard");

  const players = await getF1Leaderboard();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Classement F1
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Classement par paris vainqueur GP (gagnés, points F1 gagnés).
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-900/80 text-left text-zinc-400">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Joueur</th>
              <th className="px-4 py-3 font-medium text-right">Gagnés</th>
              <th className="px-4 py-3 font-medium text-right">Perdus</th>
              <th className="px-4 py-3 font-medium text-right">Pts F1</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const avatar = resolveAvatarUrl(player, player.id);
              const name =
                player.display_name ?? player.username ?? "Joueur";
              return (
                <tr
                  key={player.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 tabular-nums text-zinc-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="size-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-xs">
                          {name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-lime-300">
                    {player.f1_won}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                    {player.f1_lost}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {player.f1_earned_points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {players.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-400">
            Aucun pari F1 pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
