import { BalanceAdjustForm } from "@/components/admin/balance-adjust-form";
import { ResetAppPanel } from "@/components/admin/reset-app-panel";
import { UsersTable } from "@/components/admin/users-table";
import { requireAdmin } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { getAllTournamentTeams } from "@/lib/tournament/queries";

export const metadata = { title: "Admin · Joueurs" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [{ data: players }, teams] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username, points, role, favorite_team_id")
      .order("display_name", { ascending: true }),
    getAllTournamentTeams(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Joueurs & soldes</h1>
        <p className="text-sm text-muted-foreground">
          Ajuster les points, modifier pseudo et équipe favorite, ou supprimer un
          compte de test
        </p>
      </div>

      <BalanceAdjustForm players={players ?? []} />

      <ResetAppPanel />

      <UsersTable
        players={(players ?? []).map((p) => ({
          ...p,
          role: (p.role ?? "user") as "user" | "admin",
        }))}
        teams={teams}
        currentAdminId={admin.id}
      />
    </div>
  );
}
