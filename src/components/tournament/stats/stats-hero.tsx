import type { TournamentStatsPageData } from "@/lib/tournament/tournament-stats-data";
import { BarChart3, Goal, Sparkles, Users } from "lucide-react";

interface StatsHeroProps {
  data: TournamentStatsPageData;
}

function formatSyncDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatsHero({ data }: StatsHeroProps) {
  const totalGoals = data.topScorers.reduce((s, p) => s + p.goals, 0);
  const totalAssists = data.topAssisters.reduce(
    (s, p) => s + (p.assists ?? 0),
    0,
  );
  const topScorer = data.topScorers[0];
  const topAssister = data.topAssisters[0];
  const syncedLabel = formatSyncDate(data.syncedAt);

  const kpis = [
    {
      label: "Buts tournoi",
      value: totalGoals.toString(),
      sub: topScorer
        ? `Leader : ${topScorer.playerName}`
        : "En attente de données",
      icon: Goal,
      tone: "text-amber-400",
      bg: "from-amber-500/20 to-amber-600/5",
    },
    {
      label: "Passes décisives",
      value: totalAssists.toString(),
      sub: topAssister
        ? `Leader : ${topAssister.playerName}`
        : "En attente de données",
      icon: Sparkles,
      tone: "text-violet-400",
      bg: "from-violet-500/20 to-violet-600/5",
    },
    {
      label: "Équipes suivies",
      value: data.topScoringTeams.length.toString(),
      sub: data.topScoringTeams[0]
        ? `+ prolifique : ${data.topScoringTeams[0].teamName}`
        : "—",
      icon: BarChart3,
      tone: "text-emerald-400",
      bg: "from-emerald-500/20 to-emerald-600/5",
    },
    {
      label: "Pronostics pool",
      value: data.totalPoolResponses.toString(),
      sub: `${data.campaignEmoji} ${data.campaignLabel}`,
      icon: Users,
      tone: "text-sky-400",
      bg: "from-sky-500/20 to-sky-600/5",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-violet-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            Centre statistiques
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {data.campaignEmoji} {data.campaignLabel}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Performances réelles du tournoi et tendances des pronostics de votre
            pool — mis à jour depuis les données officielles.
          </p>
          {syncedLabel ? (
            <p className="mt-2 text-xs text-muted-foreground/80">
              Dernière synchro · {syncedLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${kpi.bg} p-4 backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <kpi.icon className={`size-4 shrink-0 ${kpi.tone}`} aria-hidden />
            </div>
            <p className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${kpi.tone}`}>
              {kpi.value}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
