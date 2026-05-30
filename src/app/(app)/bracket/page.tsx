import Link from "next/link";
import { TournamentTabs } from "@/components/tournament/tournament-tabs";
import { getProfile, hasSupabaseConfig } from "@/lib/auth-server";
import { getBracketSlots } from "@/lib/tournament/queries";
import { getAllGroupStandings } from "@/lib/tournament/standings";

export const metadata = { title: "Tournoi · Poules & arbre" };

export default async function BracketPage() {
  const [slots, standings] = await Promise.all([
    getBracketSlots(),
    getAllGroupStandings(),
  ]);
  const profile = hasSupabaseConfig ? await getProfile() : null;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournoi</h1>
          <p className="text-muted-foreground">
            Classements de poule et arbre éliminatoire (mis à jour après chaque
            match terminé).
          </p>
        </div>
        <Link href="/matches?view=group" className="text-sm text-primary hover:underline">
          Calendrier poules →
        </Link>
      </div>

      <TournamentTabs
        standings={standings}
        slots={slots}
        isAdmin={isAdmin}
      />
    </div>
  );
}
