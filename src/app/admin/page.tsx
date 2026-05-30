import Link from "next/link";
import { AdminMatchesList } from "@/components/admin/admin-matches-list";
import { getAdminMatches } from "@/lib/admin/matches";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Matchs" };

export default async function AdminPage() {
  const matches = await getAdminMatches();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Gestion des matchs</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/teams"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Équipes
          </Link>
          <Link
            href="/admin/matches/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Créateur de match
          </Link>
        </div>
      </div>

      <AdminMatchesList matches={matches} />
    </div>
  );
}
