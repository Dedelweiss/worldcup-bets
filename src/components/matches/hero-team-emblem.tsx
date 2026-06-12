import { TeamFlag } from "@/components/shared/team-flag";
import { getTeamColors, teamColorGradientStyle } from "@/lib/team-colors";
import { isTbdTeam } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

type Team = MatchWithTeams["home_team"];

/** Drapeau net (taille fixe) sur disque dégradé aux couleurs du pays. */
export function HeroTeamEmblem({
  team,
  className,
}: {
  team: Team;
  className?: string;
}) {
  const isTbd = isTbdTeam({
    id: team.id,
    name: team.name,
    code: team.code,
    logo_url: team.logo_url,
  });
  const palette = getTeamColors(team.code);
  const gradient = teamColorGradientStyle(palette);

  return (
    <div className={cn("flex min-w-0 flex-col items-center", className)}>
      <div className="relative shrink-0">
        <div
          className="pointer-events-none absolute -inset-3 rounded-full opacity-50 blur-2xl sm:-inset-4 sm:opacity-60"
          style={{ background: palette.from }}
          aria-hidden
        />

        <div
          className={cn(
            "relative flex size-[4.75rem] items-center justify-center overflow-hidden rounded-full",
            "shadow-[0_10px_36px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/25",
            "sm:size-[6.5rem] md:size-[8.5rem]",
          )}
          style={{ background: isTbd ? undefined : gradient }}
        >
          {isTbd ? (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950" />
          ) : (
            <>
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]"
                aria-hidden
              />
              <div className="absolute inset-0 bg-black/15" aria-hidden />
              {team.code ? (
                <span
                  className="pointer-events-none absolute select-none font-black uppercase text-white/10 sm:text-white/[0.12]"
                  style={{ fontSize: "clamp(2rem, 8vw, 3.25rem)" }}
                  aria-hidden
                >
                  {team.code.slice(0, 3)}
                </span>
              ) : null}
            </>
          )}

          <div
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full",
              "bg-zinc-950/50 p-0.5 ring-2 ring-white/35 shadow-lg backdrop-blur-[2px]",
              "sm:p-1 sm:ring-white/40",
            )}
          >
            <TeamFlag
              name={team.name}
              code={team.code}
              logoUrl={team.logo_url}
              teamId={team.id}
              size={40}
              className="sm:hidden"
              flagWidth={80}
            />
            <TeamFlag
              name={team.name}
              code={team.code}
              logoUrl={team.logo_url}
              teamId={team.id}
              size={52}
              className="hidden sm:block md:hidden"
              flagWidth={120}
            />
            <TeamFlag
              name={team.name}
              code={team.code}
              logoUrl={team.logo_url}
              teamId={team.id}
              size={60}
              className="hidden md:block"
              flagWidth={160}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
