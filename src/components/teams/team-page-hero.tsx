import { NavLink } from "@/components/layout/nav-link";
import { TeamFlag } from "@/components/shared/team-flag";
import { Badge } from "@/components/ui/badge";
import { getTeamColors } from "@/lib/team-colors";
import { cn } from "@/lib/utils";
import type { GroupStandingRow } from "@/lib/tournament/standings";
import type { TournamentTeamDetail } from "@/types/database";
import { ArrowLeft } from "lucide-react";

interface TeamPageHeroProps {
  team: TournamentTeamDetail;
  standing: {
    row: GroupStandingRow;
    rank: number;
    groupName: string;
  } | null;
}

export function TeamPageHero({ team, standing }: TeamPageHeroProps) {
  const palette = getTeamColors(team.code);
  const groupLetter = team.tournament_group?.letter;

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/40",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
        style={{
          background: `linear-gradient(135deg, ${palette.from}22 0%, transparent 45%, ${palette.to}18 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full blur-3xl"
        aria-hidden
        style={{ backgroundColor: `${palette.from}22` }}
      />

      <div className="relative border-b border-white/[0.06] px-4 py-2.5 md:px-5">
        <NavLink
          href="/bracket"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" />
          Tournoi
        </NavLink>
      </div>

      <div className="relative space-y-5 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4 md:gap-6">
            <div
              className="relative shrink-0 rounded-2xl p-1 ring-1 ring-white/10"
              style={{
                background: `linear-gradient(145deg, ${palette.from}33, ${palette.to}22)`,
              }}
            >
              <TeamFlag
                name={team.name}
                code={team.code}
                logoUrl={team.logo_url}
                teamId={team.id}
                size={88}
                flagWidth={176}
                className="rounded-xl shadow-lg ring-1 ring-white/15"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {groupLetter && (
                  <Badge variant="secondary" className="font-semibold">
                    {team.tournament_group?.name ?? `Groupe ${groupLetter}`}
                  </Badge>
                )}
                {team.code && (
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {team.code}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                {team.name}
              </h1>
              {team.coach_name && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Sélectionneur ·{" "}
                  <span className="font-medium text-foreground">{team.coach_name}</span>
                </p>
              )}
            </div>
          </div>

          {standing && (
            <div className="grid shrink-0 grid-cols-3 gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 backdrop-blur-sm sm:gap-3 sm:p-4">
              <StatPill label="Classement" value={`${standing.rank}e`} accent />
              <StatPill label="Points" value={String(standing.row.points)} accent />
              <StatPill
                label="Diff."
                value={
                  standing.row.goalDiff > 0
                    ? `+${standing.row.goalDiff}`
                    : String(standing.row.goalDiff)
                }
                positive={standing.row.goalDiff > 0}
                negative={standing.row.goalDiff < 0}
              />
            </div>
          )}
        </div>

        {standing && (
          <p className="text-sm text-muted-foreground">
            {standing.row.played > 0 ? (
              <>
                {standing.row.won}V · {standing.row.drawn}N · {standing.row.lost}D
                {" · "}
                {standing.row.goalsFor}-{standing.row.goalsAgainst} buts
              </>
            ) : (
              "Aucun match de poule joué pour le moment."
            )}
          </p>
        )}
      </div>
    </header>
  );
}

function StatPill({
  label,
  value,
  accent,
  positive,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="min-w-[4.5rem] text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums md:text-xl",
          accent && "text-primary",
          positive && "text-green-500",
          negative && "text-red-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}
