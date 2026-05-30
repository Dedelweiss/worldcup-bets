import Link from "next/link";
import { getAdminMatches } from "@/lib/admin/matches";
import { formatKickoff, formatOdd } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/types/database";

export const metadata = { title: "Admin · Matchs" };

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

export default async function AdminPage() {
  const matches = await getAdminMatches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des matchs</h1>
        <Link
          href="/admin/matches/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          + Nouveau match
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Aucun match. Créez le premier via « Nouveau match ».
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Match</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Cotes 1-N-2</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">
                    {m.home_team.name} vs {m.away_team.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatKickoff(m.kickoff_at)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs">
                    {m.odd_home && m.odd_draw && m.odd_away
                      ? `${formatOdd(m.odd_home)} · ${formatOdd(m.odd_draw)} · ${formatOdd(m.odd_away)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {m.home_score !== null && m.away_score !== null
                      ? `${m.home_score} - ${m.away_score}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {STATUS_LABEL[m.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/matches/${m.id}`}
                      className="text-primary hover:underline"
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
