import Link from "next/link";
import { BracketView } from "@/components/bracket/bracket-view";
import { getProfile, hasSupabaseConfig } from "@/lib/auth-server";
import { getBracketSlots } from "@/lib/tournament/queries";

export const metadata = { title: "Arbre du tournoi" };

export default async function BracketPage() {
  const slots = await getBracketSlots();
  const profile = hasSupabaseConfig ? await getProfile() : null;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arbre éliminatoire</h1>
          <p className="text-muted-foreground">
            Se remplit au fur et à mesure que l&apos;admin crée les matchs et valide
            les scores.
          </p>
        </div>
        <Link href="/matches?view=knockout" className="text-sm text-primary hover:underline">
          Calendrier phase finale →
        </Link>
      </div>

      <BracketView slots={slots} isAdmin={isAdmin} />
    </div>
  );
}
