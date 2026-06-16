"use client";

import { motion } from "framer-motion";
import { HeroTeamBlock } from "@/components/matches/hero-team-block";
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
        className="rounded-md ring-1 ring-white/10"
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

  return (
    <div
      className={cn("w-full", isHero && "max-w-3xl", className)}
      aria-label="Match en direct, en attente du premier but"
    >
      <div
        className={cn(
          "grid w-full items-center",
          isHero
            ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 sm:gap-8"
            : "flex gap-2",
        )}
      >
        {isHero ? (
          <HeroTeamBlock team={homeTeam} side="home" />
        ) : (
          <TeamBadge team={homeTeam} />
        )}

        <div
          className={cn(
            "relative",
            isHero ? "h-14 w-16 sm:h-20 sm:w-28" : "h-14 min-w-[100px] flex-1",
          )}
        >
          <div
            className="absolute inset-x-0 bottom-3 h-px bg-white/10"
            aria-hidden
          />

          <motion.span
            className={cn(
              "absolute bottom-2 left-0 z-10 block leading-none drop-shadow-md will-change-transform",
              isHero ? "text-2xl sm:text-3xl" : "text-2xl",
            )}
            animate={{
              left: ["0%", "100%"],
              y: [0, isHero ? -28 : -34, 0],
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
          <HeroTeamBlock team={awayTeam} side="away" />
        ) : (
          <TeamBadge team={awayTeam} />
        )}
      </div>
    </div>
  );
}
