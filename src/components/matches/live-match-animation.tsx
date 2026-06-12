"use client";

import { motion } from "framer-motion";
import { HeroTeamEmblem } from "@/components/matches/hero-team-emblem";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { Team } from "@/types/database";

function TeamBadge({ team }: { team: Team }) {
  const name = tbdTeamDisplayName(team);

  return (
    <div className="relative z-10 flex shrink-0 flex-col items-center gap-1">
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={40}
        className="border-2 border-white/15 shadow-sm"
      />
      <span className="max-w-[72px] truncate text-[10px] font-medium text-muted-foreground">
        {name}
      </span>
    </div>
  );
}

interface LiveMatchAnimationProps {
  homeTeam: Team;
  awayTeam: Team;
  variant?: "default" | "hero";
  className?: string;
}

const BOUNCE_DURATION = 1.35;

/** Ballon entre les drapeaux — tant qu'il n'y a pas de but. */
export function LiveMatchAnimation({
  homeTeam,
  awayTeam,
  variant = "default",
  className,
}: LiveMatchAnimationProps) {
  const isHero = variant === "hero";
  const homeName = tbdTeamDisplayName(homeTeam);
  const awayName = tbdTeamDisplayName(awayTeam);

  return (
    <div
      className={cn(
        "w-full",
        isHero && "flex max-w-4xl flex-col gap-2 sm:gap-4",
        className,
      )}
      aria-label="Match en direct, en attente du premier but"
    >
      <div
        className={cn(
          "flex w-full items-center",
          isHero ? "gap-1.5 sm:gap-8" : "gap-2",
        )}
      >
        {isHero ? (
          <HeroTeamEmblem team={homeTeam} className="flex-1" />
        ) : (
          <TeamBadge team={homeTeam} />
        )}

        <div
          className={cn(
            "relative flex-1",
            isHero ? "h-16 min-w-[56px] sm:h-24 sm:min-w-[120px]" : "h-14 min-w-[100px]",
          )}
        >
          <div
            className="absolute inset-x-0 bottom-3 h-px bg-white/10"
            aria-hidden
          />

          <motion.span
            className={cn(
              "absolute bottom-2 left-0 z-10 block leading-none drop-shadow-md will-change-transform",
              isHero ? "text-2xl sm:text-4xl" : "text-2xl",
            )}
            animate={{
              left: ["0%", "100%"],
              y: [0, isHero ? -36 : -34, 0],
            }}
            transition={{
              duration: BOUNCE_DURATION,
              repeat: Infinity,
              repeatType: "mirror",
              ease: [0.42, 0, 0.58, 1],
            }}
            style={{ x: "-50%" }}
            aria-hidden
          >
            ⚽
          </motion.span>
        </div>

        {isHero ? (
          <HeroTeamEmblem team={awayTeam} className="flex-1" />
        ) : (
          <TeamBadge team={awayTeam} />
        )}
      </div>

      {isHero ? (
        <div className="grid grid-cols-2 gap-2 px-1 text-center sm:hidden">
          <p className="truncate text-xs font-semibold leading-tight">{homeName}</p>
          <p className="truncate text-xs font-semibold leading-tight">{awayName}</p>
        </div>
      ) : null}
    </div>
  );
}
