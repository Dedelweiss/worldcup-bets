"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Minus, Target } from "lucide-react";
import { TeamFlag } from "@/components/shared/team-flag";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { formatKickoff, formatKickoffRelative, formatOdd } from "@/lib/format";
import { selectionLabel } from "@/lib/bets/match-result-copy";
import {
  triggerCountryExplosion,
  triggerDrawExplosion,
} from "@/lib/gamification/trigger-country-explosion";
import { cn } from "@/lib/utils";
import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

const SWIPE_OFFSET = 88;
const SWIPE_VELOCITY = 450;

export type SwipeChoice = MatchResultSelection;

interface QuickBetSwipeCardProps {
  match: MatchWithTeams;
  disabled?: boolean;
  onSwipe: (choice: SwipeChoice) => void;
  onOpenDetail: () => void;
}

export function QuickBetSwipeCard({
  match,
  disabled,
  onSwipe,
  onOpenDetail,
}: QuickBetSwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-10, 10]);

  const homeOpacity = useTransform(x, [-120, -40], [1, 0]);
  const awayOpacity = useTransform(x, [40, 120], [0, 1]);
  const drawOpacity = useTransform(y, [-120, -40], [1, 0]);

  function resolveChoice(info: PanInfo): SwipeChoice | null {
    const { x: ox, y: oy } = info.offset;
    const vx = info.velocity.x;
    const vy = info.velocity.y;

    if (oy < -SWIPE_OFFSET || vy < -SWIPE_VELOCITY) {
      if (Math.abs(oy) >= Math.abs(ox) * 0.6) return "draw";
    }
    if (ox < -SWIPE_OFFSET || vx < -SWIPE_VELOCITY) return "home";
    if (ox > SWIPE_OFFSET || vx > SWIPE_VELOCITY) return "away";
    return null;
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (disabled) return;

    const choice = resolveChoice(info);
    if (!choice) {
      return;
    }

    if (choice === "home") {
      triggerCountryExplosion(match.home_team.code, "left");
    } else if (choice === "away") {
      triggerCountryExplosion(match.away_team.code, "right");
    } else {
      triggerDrawExplosion();
    }

    const exitX =
      choice === "home" ? -520 : choice === "away" ? 520 : 0;
    const exitY = choice === "draw" ? -520 : 0;

    void Promise.all([
      animate(x, exitX, { duration: 0.22, ease: "easeIn" }),
      animate(y, exitY, { duration: 0.22, ease: "easeIn" }),
    ]).then(() => onSwipe(choice));
  }

  return (
    <motion.div
      className={cn(
        "relative mx-auto w-full max-w-sm touch-none select-none",
        disabled && "pointer-events-none opacity-60",
      )}
      style={{ x, y, rotate }}
      drag={!disabled}
      dragElastic={0.85}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: "grabbing" }}
    >
      {/* Indicateurs de swipe */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-start rounded-3xl bg-lime-400/25 pl-6"
        style={{ opacity: homeOpacity }}
      >
        <span className="font-heading text-lg font-bold text-lime-300">
          {match.home_team.name}
        </span>
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-end rounded-3xl bg-sky-400/20 pr-6"
        style={{ opacity: awayOpacity }}
      >
        <span className="text-right font-heading text-lg font-bold text-sky-200">
          {match.away_team.name}
        </span>
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-start rounded-3xl bg-fuchsia-500/20 pt-8"
        style={{ opacity: drawOpacity }}
      >
        <Minus className="size-8 text-fuchsia-300" aria-hidden />
        <span className="font-heading text-lg font-bold text-fuchsia-200">
          Match nul
        </span>
      </motion.div>

      <article
        role="group"
        aria-label={`${match.home_team.name} contre ${match.away_team.name}`}
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-md"
      >
        <div className="mb-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{match.round ?? "Poule"}</span>
          <div className="flex items-center gap-1.5">
            {match.is_golden && <GoldenMatchBadge compact />}
            <span>{formatKickoff(match.kickoff_at)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-6">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamFlag
              name={match.home_team.name}
              code={match.home_team.code}
              logoUrl={match.home_team.logo_url}
              size={72}
              className="size-[4.5rem] shadow-lg"
            />
            <p className="line-clamp-2 font-heading text-base font-semibold leading-tight">
              {match.home_team.name}
            </p>
            {match.odd_home != null && (
              <p className="text-sm tabular-nums text-lime-400">
                {formatOdd(match.odd_home)}
              </p>
            )}
          </div>

          <span className="shrink-0 font-heading text-sm font-bold text-zinc-500">
            VS
          </span>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamFlag
              name={match.away_team.name}
              code={match.away_team.code}
              logoUrl={match.away_team.logo_url}
              size={72}
              className="size-[4.5rem] shadow-lg"
            />
            <p className="line-clamp-2 font-heading text-base font-semibold leading-tight">
              {match.away_team.name}
            </p>
            {match.odd_away != null && (
              <p className="text-sm tabular-nums text-lime-400">
                {formatOdd(match.odd_away)}
              </p>
            )}
          </div>
        </div>

        {match.odd_draw != null && (
          <p className="mb-4 text-center text-xs text-muted-foreground">
            Nul · {formatOdd(match.odd_draw)} ·{" "}
            {formatKickoffRelative(match.kickoff_at)}
          </p>
        )}

        <button
          type="button"
          onClick={onOpenDetail}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-foreground transition-colors hover:border-lime-400/40 hover:bg-lime-400/10"
        >
          <Target className="size-4 text-lime-400" aria-hidden />
          Score exact · ouvrir le match
        </button>
      </article>
    </motion.div>
  );
}

export function swipeChoiceLabel(
  choice: SwipeChoice,
  match: MatchWithTeams,
): string {
  if (choice === "home") return match.home_team.name;
  if (choice === "away") return match.away_team.name;
  return selectionLabel("draw");
}
