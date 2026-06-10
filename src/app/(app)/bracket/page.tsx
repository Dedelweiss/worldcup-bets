import Link from "next/link";
import { TournamentTabs } from "@/components/tournament/tournament-tabs";
import { getUserMatchBetStatuses } from "@/lib/bets/user-match-status-query";
import { hasSupabaseConfig, requireAuth } from "@/lib/auth-server";
import { getBracketSlots } from "@/lib/tournament/queries";
import { getAllGroupStandings } from "@/lib/tournament/standings";

export const metadata = { title: "Tournoi · Poules & arbre" };

export default async function BracketPage() {
  const profile = hasSupabaseConfig ? await requireAuth() : null;
  const [slots, standings] = await Promise.all([
    getBracketSlots(),
    getAllGroupStandings(),
  ]);
  const isAdmin = profile?.role === "admin";

  const knockoutMatchIds = [
    ...new Set(
      slots
        .map((s) => s.match?.id)
        .filter((id): id is number => id != null),
    ),
  ];
  const betStatuses =
    profile && knockoutMatchIds.length > 0
      ? await getUserMatchBetStatuses(profile.id, knockoutMatchIds)
      : {};

  return (
    <div className="min-w-0 space-y-6 scroll-mt-16 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournoi</h1>
          <p className="text-muted-foreground">
            Classements de poule et arbre éliminatoire. Cliquez une équipe dans
            la phase finale pour choisir votre vainqueur (temps réglementaire).
          </p>
        </div>
        <Link href="/matches?view=group" className="text-sm text-primary hover:underline">
          Calendrier poules →
        </Link>
      </div>

      <TournamentTabs
        standings={standings}
        slots={slots}
        betStatuses={betStatuses}
        isAdmin={isAdmin}
      />
    </div>
  );
}
