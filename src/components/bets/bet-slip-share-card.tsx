"use client";

import { Flame, Radio } from "lucide-react";
import type { BetSlipShareLine } from "@/lib/bets/bet-slip-share";
import { cn } from "@/lib/utils";

interface BetSlipShareCardProps {
  playerName: string;
  lines: BetSlipShareLine[];
  onFire?: boolean;
  className?: string;
}

export function BetSlipShareCard({
  playerName,
  lines,
  onFire = false,
  className,
}: BetSlipShareCardProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-[9/16] w-[270px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-zinc-950 p-5 text-white shadow-2xl",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.18),transparent_55%)]"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-300">
            Mon slip
          </p>
          <p className="mt-1 font-heading text-lg font-bold leading-tight">
            {playerName}
          </p>
        </div>
        {onFire && (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/15 px-2 py-1 text-[10px] font-semibold text-orange-300">
            <Flame className="size-3 fill-orange-400 text-orange-400" aria-hidden />
            On Fire
          </span>
        )}
      </div>

      <div className="relative mt-5 flex-1 space-y-2.5">
        {lines.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun pari à afficher.</p>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-[11px] font-medium text-zinc-300">
                  {line.matchLabel}
                </p>
                {line.isLive && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-lime-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-lime-300">
                    <Radio className="size-2.5" aria-hidden />
                    Live
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                {line.pickLabel}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                <span>Cote {line.oddLabel}</span>
                <span className="font-semibold text-lime-300">
                  {line.pointsLabel}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="relative mt-4 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        WC2026 Pool
      </p>
    </div>
  );
}
