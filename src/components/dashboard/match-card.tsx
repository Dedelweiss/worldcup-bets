import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { formatKickoff, formatKickoffRelative, formatOdd } from "@/lib/format";
import type { MatchWithTeams } from "@/types/database";

interface MatchCardProps {
  match: MatchWithTeams;
}

function TeamRow({
  name,
  code,
  logoUrl,
}: {
  name: string;
  code: string | null;
  logoUrl: string | null;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={28}
          height={28}
          className="size-7 rounded-full bg-muted object-contain p-0.5"
          unoptimized
        />
      ) : (
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
          {code ?? "?"}
        </span>
      )}
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

export function MatchCard({ match }: MatchCardProps) {
  const isLive = match.status === "live";

  return (
    <Card className="overflow-hidden transition-colors hover:border-primary/40">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
          <Badge variant={isLive ? "default" : "secondary"} className="text-[10px]">
            {isLive ? "EN DIRECT" : match.round ?? "Coupe du Monde"}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatKickoff(match.kickoff_at)}
            <span className="hidden sm:inline">· {formatKickoffRelative(match.kickoff_at)}</span>
          </span>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <TeamRow
              name={match.home_team.name}
              code={match.home_team.code}
              logoUrl={match.home_team.logo_url}
            />
            <span className="text-xs font-semibold text-muted-foreground">vs</span>
            <TeamRow
              name={match.away_team.name}
              code={match.away_team.code}
              logoUrl={match.away_team.logo_url}
            />
          </div>

          {match.odd_home && match.odd_draw && match.odd_away && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "1", odd: match.odd_home },
                { label: "N", odd: match.odd_draw },
                { label: "2", odd: match.odd_away },
              ].map((outcome) => (
                <button
                  key={outcome.label}
                  type="button"
                  className="flex flex-col items-center rounded-lg border border-border bg-muted/20 py-2 transition-colors hover:border-primary hover:bg-primary/10"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {outcome.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {formatOdd(outcome.odd)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/60 px-4 py-3">
          <Link
            href={`/matches/${match.id}`}
            className={cn(buttonVariants({ size: "sm" }), "w-full")}
          >
            Parier sur ce match
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
