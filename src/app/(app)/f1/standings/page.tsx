import { requireAuth } from "@/lib/auth-server";
import { F1StandingsTabs } from "@/components/f1/f1-standings-tabs";
import { getF1ChampionshipStandings, isF1ModeEnabled } from "@/lib/f1/queries";
import { redirect } from "next/navigation";

export const metadata = { title: "Championnat F1 · WC2026 Pool" };

export default async function F1StandingsPage() {
  await requireAuth();
  if (!(await isF1ModeEnabled())) redirect("/dashboard");

  let data;
  try {
    data = await getF1ChampionshipStandings();
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">Championnat F1</h1>
        <p className="text-sm text-zinc-400">
          Classement indisponible pour le moment. Réessayez plus tard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Championnat F1
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Classement pilotes et constructeurs — saison en cours.
        </p>
      </header>

      <F1StandingsTabs
        drivers={data.drivers.standings}
        constructors={data.constructors.standings}
        season={data.drivers.season}
        round={data.drivers.round}
      />
    </div>
  );
}
