import { TeamNavLink } from "@/components/shared/team-nav-link";
import { TeamFlag } from "@/components/shared/team-flag";
import { getTeamColors } from "@/lib/team-colors";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

type Team = MatchWithTeams["home_team"];

interface HeroTeamBlockProps {
  team: Team;
  side: "home" | "away";
  className?: string;
}

/** Drapeau + nom — style broadcast, sans disque ni halo. */
export function HeroTeamBlock({ team, side, className }: HeroTeamBlockProps) {
  const name = tbdTeamDisplayName(team);
  const palette = getTeamColors(team.code);
  const isHome = side === "home";

  const content = (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5",
        isHome ? "items-end text-right" : "items-start text-left",
        "transition-opacity hover:opacity-90",
        className,
      )}
    >
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={48}
        flagWidth={96}
        className="rounded-md shadow-sm ring-1 ring-white/10 sm:hidden"
      />
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={56}
        flagWidth={112}
        className="hidden rounded-md shadow-sm ring-1 ring-white/10 sm:block"
      />

      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          isHome ? "flex-row" : "flex-row-reverse",
        )}
      >
        <span
          className="h-5 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: palette.from }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight sm:text-base md:text-lg">
            {name}
          </p>
          {team.code ? (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground md:text-xs">
              {team.code}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <TeamNavLink team={team} className="min-w-0">
      {content}
    </TeamNavLink>
  );
}
