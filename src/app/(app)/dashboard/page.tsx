import { WalletCard } from "@/components/dashboard/wallet-card";
import { UpcomingMatches } from "@/components/dashboard/upcoming-matches";
import { getDashboardData } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Tableau de bord · WC2026 Pool",
  description: "Portefeuille virtuel et prochains matchs de la Coupe du Monde 2026",
};

export default async function DashboardPage() {
  const { profile, upcomingMatches } = await getDashboardData();
  const usingMock =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          {usingMock && (
            <Badge variant="outline" className="text-[10px]">
              Mode démo
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Pariez entre amis sur la Coupe du Monde 2026 avec votre bankroll virtuelle.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
        <WalletCard profile={profile} />
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-card/50 p-4">
          {[
            { label: "Paris en cours", value: "0" },
            { label: "Gains totaux", value: "0 €" },
            { label: "Classement", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Prochains matchs</h2>
            <p className="text-sm text-muted-foreground">
              Coupe du Monde FIFA 2026 · Paris 1N2
            </p>
          </div>
        </div>
        <UpcomingMatches matches={upcomingMatches} />
      </section>
    </div>
  );
}
