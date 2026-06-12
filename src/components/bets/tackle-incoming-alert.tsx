"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, Swords, TrendingDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  displayPlayerName,
  type IncomingTackleOnMatch,
} from "@/lib/bets/match-tackle-utils";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

function attackerInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function TackleIncomingCard({ tackle }: { tackle: IncomingTackleOnMatch }) {
  const attackerName = displayPlayerName(
    tackle.attacker_username,
    tackle.attacker_display_name,
  );

  const pending = !tackle.is_resolved;
  const attackerWon = tackle.is_resolved && tackle.attacker_won === true;
  const attackerFailed = tackle.is_resolved && tackle.attacker_won === false;
  const lostPts =
    tackle.target_delta != null && tackle.target_delta < 0
      ? Math.abs(tackle.target_delta)
      : null;
  const attackerPenalty =
    tackle.attacker_delta != null && tackle.attacker_delta < 0
      ? Math.abs(tackle.attacker_delta)
      : null;

  const shellClass = pending
    ? "border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent shadow-[0_0_32px_-12px] shadow-amber-500/25"
    : attackerWon
      ? "border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-red-500/5 to-transparent"
      : "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-lime-500/5 to-transparent";

  const Icon = pending ? ShieldAlert : attackerWon ? TrendingDown : ShieldCheck;
  const iconClass = pending
    ? "text-amber-400"
    : attackerWon
      ? "text-rose-400"
      : "text-emerald-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-3 sm:p-3.5",
        shellClass,
        pending && "animate-[pulse_2.8s_ease-in-out_infinite]",
      )}
    >
      {pending && (
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-amber-400/10 blur-2xl"
          aria-hidden
        />
      )}

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="size-10 ring-2 ring-white/15 sm:size-11">
            {tackle.attacker_avatar_url ? (
              <AvatarImage src={tackle.attacker_avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {attackerInitials(attackerName)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-background bg-zinc-900",
              iconClass,
            )}
          >
            <Swords className="size-3" aria-hidden />
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden />
            <p className="text-sm font-semibold leading-snug">
              {pending && (
                <>
                  <span className="text-foreground">{attackerName}</span>
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    t&apos;a mis un Tacle Glissé
                  </span>
                </>
              )}
              {attackerWon && (
                <>
                  Tacle subi —{" "}
                  <span className="text-foreground">{attackerName}</span>
                </>
              )}
              {attackerFailed && (
                <>
                  Tacle esquivé —{" "}
                  <span className="text-foreground">{attackerName}</span>
                </>
              )}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {pending &&
              "Fais mieux que lui sur ce match pour ne rien perdre. Le gagnant du duel prend 30 % de l'enjeu de l'autre."}
            {attackerWon && lostPts != null && (
              <>
                Son pronostic a été meilleur —{" "}
                <span className="font-semibold text-rose-400">
                  −{formatPoints(lostPts)} pts
                </span>{" "}
                sur ta mise.
              </>
            )}
            {attackerFailed && attackerPenalty != null && (
              <>
                Tu as fait mieux : il perd{" "}
                <span className="font-semibold text-emerald-400">
                  {formatPoints(attackerPenalty)} pts
                </span>
                , toi tu ne perds rien.
              </>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface TackleIncomingAlertProps {
  tackles: IncomingTackleOnMatch[];
  className?: string;
}

/** Alerte visible quand un rival a (ou a tenté de) tacler le joueur sur ce match. */
export function TackleIncomingAlert({
  tackles,
  className,
}: TackleIncomingAlertProps) {
  if (tackles.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {tackles.map((tackle) => (
        <TackleIncomingCard key={tackle.id} tackle={tackle} />
      ))}
    </div>
  );
}
