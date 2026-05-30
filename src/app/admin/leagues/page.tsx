import Link from "next/link";
import { CreateLeagueForm } from "@/components/admin/create-league-form";
import { getAllLeaguesForAdmin } from "@/lib/leagues/admin-queries";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Ligues privées" };

export default async function AdminLeaguesPage() {
  const leagues = await getAllLeaguesForAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ligues privées</h1>
        <p className="text-sm text-muted-foreground">
          Créez des ligues et assignez les joueurs pour des classements filtrés.
        </p>
      </div>

      <CreateLeagueForm />

      {leagues.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Aucune ligue. Créez la première ci-dessus.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ligue</th>
                <th className="px-4 py-3 font-medium">Membres</th>
                <th className="px-4 py-3 font-medium">Code invite</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {leagues.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3 tabular-nums">{l.member_count}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {l.invite_code}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/leagues/${l.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Gérer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
