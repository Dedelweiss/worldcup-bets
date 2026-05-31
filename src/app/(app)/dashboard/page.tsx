import Link from "next/link";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { UpcomingMatches } from "@/components/dashboard/upcoming-matches";
import { getDashboardData } from "@/lib/dashboard";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Tableau de bord · WC2026 Pool",
  description: "Portefeuille virtuel et prochains matchs de la Coupe du Monde 2026",
};

export default async function DashboardPage() {
  const { profile, upcomingMatches, isDemo } = await getDashboardData();

  return (
    <div className="space-y-8">
      {!isDemo && <LiveStatusPoller />}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {getPlayerLabel(profile)}
          </h1>
          {isDemo && (
            <Badge variant="outline" className="text-[10px]">
              Mode démo — configurez Supabase
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Pariez entre amis sur la Coupe du Monde 2026 et cumulez des points selon les cotes.
        </p>
      </section>

      {!isDemo && !profile.username && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm">
            Choisissez un <strong>pseudo</strong> pour apparaître dans le
            classement et les matchs en direct.
          </p>
          <Link href="/profile" className={cn(buttonVariants({ size: "sm" }))}>
            Choisir mon pseudo
          </Link>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
        <WalletCard profile={profile} />
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-card/50 p-4">
          {[
            { label: "Paris en cours", value: "0" },
            { label: "Gains totaux", value: "0 pts" },
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
        <div>
          <h2 className="text-lg font-semibold">Prochains matchs</h2>
          <p className="text-sm text-muted-foreground">
            Coupe du Monde FIFA 2026 · Paris 1N2
          </p>
        </div>
        {upcomingMatches.length === 0 && !isDemo ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Aucun match à venir. Un administrateur peut en créer depuis{" "}
            <strong className="text-foreground">/admin</strong>.
          </p>
        ) : (
          <UpcomingMatches matches={upcomingMatches} />
        )}
      </section>
    </div>
  );
}
