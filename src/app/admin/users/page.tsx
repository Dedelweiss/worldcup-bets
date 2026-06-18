import { BalanceAdjustForm } from "@/components/admin/balance-adjust-form";
import { PlayerDataExportPanel } from "@/components/admin/player-data-export-panel";
import { ResetAppPanel } from "@/components/admin/reset-app-panel";
import { UsersTable } from "@/components/admin/users-table";
import { buildAdminUserJokersMap } from "@/lib/admin/user-jokers";
import { requireAdmin } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { getAllTournamentTeams } from "@/lib/tournament/queries";
import type { TacklePhase } from "@/types/database";

export const metadata = { title: "Admin · Joueurs" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [{ data: players }, { data: tackles }, { data: boostedBets }, teams] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, display_name, username, points, role, favorite_team_id, boosts_available",
        )
        .order("display_name", { ascending: true }),
      supabase
        .from("tackles")
        .select("id, attacker_id, phase, match_id, is_resolved"),
      supabase
        .from("bets")
        .select("user_id")
        .eq("status", "pending")
        .eq("is_boosted", true)
        .in("bet_type", ["match_result", "exact_score"]),
      getAllTournamentTeams(),
    ]);

  const jokersByUser = buildAdminUserJokersMap(
    (tackles ?? []).map((row) => ({
      id: row.id,
      attacker_id: row.attacker_id,
      phase: row.phase as TacklePhase,
      match_id: row.match_id,
      is_resolved: Boolean(row.is_resolved),
    })),
    (boostedBets ?? []).map((row) => row.user_id),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Joueurs & soldes</h1>
        <p className="text-sm text-muted-foreground">
          Ajuster les points, voir boost et tacles par joueur, modifier pseudo et
          équipe favorite, ou supprimer un compte de test
        </p>
      </div>

      <BalanceAdjustForm players={players ?? []} />

      <PlayerDataExportPanel />

      <ResetAppPanel />

      <UsersTable
        players={(players ?? []).map((p) => {
          const extra = jokersByUser.get(p.id);
          return {
            ...p,
            role: (p.role ?? "user") as "user" | "admin",
            jokers: {
              boostsAvailable: p.boosts_available ?? 0,
              hasPendingBoostedBet: extra?.hasPendingBoostedBet ?? false,
              tackles: extra?.tackles ?? [],
            },
          };
        })}
        teams={teams}
        currentAdminId={admin.id}
      />
    </div>
  );
}
