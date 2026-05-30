import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatKickoff, formatKickoffRelative } from "@/lib/format";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

interface MatchHeaderProps {
  match: MatchWithTeams;
}

export function MatchHeader({ match }: MatchHeaderProps) {
  const isLive = match.status === "live";

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isLive ? "default" : "secondary"}>
          {STATUS_LABEL[match.status]}
        </Badge>
        {match.round && (
          <span className="text-sm text-muted-foreground">{match.round}</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        <TeamBlock team={match.home_team} />
        <div className="text-center">
          {match.home_score !== null && match.away_score !== null ? (
            <p className="text-3xl font-bold tabular-nums">
              {match.home_score} - {match.away_score}
            </p>
          ) : (
            <p className="text-lg font-semibold text-muted-foreground">vs</p>
          )}
        </div>
        <TeamBlock team={match.away_team} align="right" />
      </div>

      <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <Clock className="size-3.5" />
        {formatKickoff(match.kickoff_at)} · {formatKickoffRelative(match.kickoff_at)}
        {match.venue ? ` · ${match.venue}` : ""}
      </p>
    </div>
  );
}

function TeamBlock({
  team,
  align = "left",
}: {
  team: MatchWithTeams["home_team"];
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-2 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={team.name}
          width={56}
          height={56}
          className="size-14 rounded-full bg-muted object-contain p-1"
          unoptimized
        />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold">
          {team.code ?? team.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="max-w-[120px] text-center text-sm font-semibold leading-tight">
        {team.name}
      </span>
    </div>
  );
}
