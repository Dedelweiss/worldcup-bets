"use client";

import { motion } from "framer-motion";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { tbdTeamDisplayName } from "@/lib/tournament/tbd-team";
import type { Team } from "@/types/database";

function TeamBadge({ team }: { team: Team }) {
  return (
    <div className="relative z-10 flex shrink-0 flex-col items-center gap-1">
      <TeamFlag
        name={team.name}
        code={team.code}
        logoUrl={team.logo_url}
        teamId={team.id}
        size={40}
        className="border-2 border-primary/50 shadow-sm"
      />
      <span className="max-w-[72px] truncate text-[10px] font-medium text-muted-foreground">
        {tbdTeamDisplayName(team)}
      </span>
    </div>
  );
}

interface LiveMatchAnimationProps {
  homeTeam: Team;
  awayTeam: Team;
  className?: string;
}

const BOUNCE_DURATION = 1.35;

export function LiveMatchAnimation({
  homeTeam,
  awayTeam,
  className,
}: LiveMatchAnimationProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-3",
        className,
      )}
    >
      <TeamBadge team={homeTeam} />

      <div className="relative h-14 min-w-[100px] flex-1">
        <div
          className="absolute inset-x-0 bottom-3 h-px bg-primary/25"
          aria-hidden
        />

        <motion.span
          className="absolute bottom-2 left-0 z-10 block text-2xl leading-none drop-shadow-md will-change-transform"
          animate={{
            left: ["0%", "100%"],
            y: [0, -34, 0],
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

      <TeamBadge team={awayTeam} />
    </div>
  );
}
