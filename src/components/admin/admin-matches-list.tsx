import Link from "next/link";
import { AdminMatchSortHeader } from "@/components/admin/admin-matches-filters";
import { TeamFlag } from "@/components/shared/team-flag";
import type {
  AdminMatchSortField,
  AdminMatchSortOrder,
} from "@/lib/admin/match-sort";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { formatKickoff, formatOdd } from "@/lib/format";
import { goldenMatchCardClass } from "@/lib/golden-match";
import { cn } from "@/lib/utils";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

function statusVariant(
  status: MatchStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "live") return "default";
  if (status === "finished") return "secondary";
  if (status === "cancelled" || status === "postponed") return "outline";
  return "secondary";
}

function formatOddsLine(match: MatchWithTeams): string {
  if (match.odd_home && match.odd_draw && match.odd_away) {
    return `${formatOdd(match.odd_home)} · ${formatOdd(match.odd_draw)} · ${formatOdd(match.odd_away)}`;
  }
  return "—";
}

function formatScoreLine(match: MatchWithTeams): string {
  if (match.home_score !== null && match.away_score !== null) {
    return `${match.home_score} – ${match.away_score}`;
  }
  return "—";
}

interface AdminMatchesListProps {
  matches: MatchWithTeams[];
  sortField: AdminMatchSortField;
  sortOrder: AdminMatchSortOrder;
}

export function AdminMatchesList({
  matches,
  sortField,
  sortOrder,
}: AdminMatchesListProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucun match. Créez le premier via « Créateur de match ».
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {matches.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-sm",
              goldenMatchCardClass(m.is_golden ?? false, m.status === "live"),
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {(m.is_golden ?? false) && <GoldenMatchBadge compact />}
                <Badge variant={statusVariant(m.status)} className="shrink-0 text-[10px]">
                  {STATUS_LABEL[m.status]}
                </Badge>
              </div>
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {formatKickoff(m.kickoff_at)}
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <MatchTeamRow team={m.home_team} />
              <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                vs
              </p>
              <MatchTeamRow team={m.away_team} />
            </div>

            {(m.round || m.tournament_group?.name) && (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {[m.tournament_group?.name, m.round].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/30 px-2 py-2">
                <p className="text-[10px] text-muted-foreground">Cotes résultat</p>
                <p className="mt-0.5 font-medium tabular-nums">{formatOddsLine(m)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 px-2 py-2">
                <p className="text-[10px] text-muted-foreground">Score</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums">
                  {formatScoreLine(m)}
                </p>
              </div>
            </div>

            <Link
              href={`/admin/matches/${m.id}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-4 w-full",
              )}
            >
              Gérer le match
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Match
              </th>
              <AdminMatchSortHeader
                column="date"
                label="Date"
                sortField={sortField}
                sortOrder={sortOrder}
              />
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Cotes résultat
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Score
              </th>
              <AdminMatchSortHeader
                column="status"
                label="Statut"
                sortField={sortField}
                sortOrder={sortOrder}
              />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr
                key={m.id}
                className={cn(
                  "border-t border-border/60",
                  m.status === "live" && "bg-primary/5",
                )}
              >
                <td className="px-4 py-3 font-medium">
                  {m.home_team.name} vs {m.away_team.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatKickoff(m.kickoff_at)}
                </td>
                <td className="px-4 py-3 tabular-nums text-xs">
                  {formatOddsLine(m)}
                </td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {formatScoreLine(m)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(m.status)} className="text-[10px]">
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
    </>
  );
}

function MatchTeamRow({ team }: { team: MatchWithTeams["home_team"] }) {
  return (
    <div className="flex items-center gap-2">
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        size={24}
      />
      <span className="min-w-0 truncate text-sm font-medium">{team.name}</span>
    </div>
  );
}
