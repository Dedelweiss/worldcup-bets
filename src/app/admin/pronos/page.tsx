import { AdminFinishedPronosExplorer } from "@/components/admin/admin-finished-pronos-explorer";
import { getFinishedPronosByPlayer } from "@/lib/admin/finished-pronos-by-player";

export const metadata = { title: "Admin · Pronostics terminés" };

export default async function AdminFinishedPronosPage() {
  const groups = await getFinishedPronosByPlayer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pronostics — matchs terminés
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historique complet des pronos par joueur sur tous les matchs au statut
          terminé.
        </p>
      </div>

      <AdminFinishedPronosExplorer groups={groups} />
    </div>
  );
}
