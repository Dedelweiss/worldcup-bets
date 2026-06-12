"use client";

import type { ReactNode } from "react";
import { Brain, History, Users } from "lucide-react";
import { motion } from "framer-motion";
import { TeamFlag } from "@/components/shared/team-flag";
import type { PreMatchInsights } from "@/lib/bets/pre-match-insights";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

interface PreMatchAssistantProps {
  match: MatchWithTeams;
  insights: PreMatchInsights;
  className?: string;
}

function CrowdBar({
  label,
  pct,
  accentClass,
}: {
  label: ReactNode;
  pct: number;
  accentClass: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="flex min-w-0 items-center gap-1 truncate font-medium text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", accentClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function PreMatchAssistant({
  match,
  insights,
  className,
}: PreMatchAssistantProps) {
  const { crowd, aiLabel, personalInsight } = insights;

  return (
    <motion.div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md",
        className,
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-label="Assistant coach pré-match"
    >
      <div className="border-b border-white/10 bg-gradient-to-r from-lime-400/10 via-transparent to-fuchsia-500/10 px-3 py-2">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-lime-300">
          Assistant Coach
        </p>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-lime-400" aria-hidden />
            <div>
              <p className="text-xs font-semibold">La Foule</p>
              <p className="text-[10px] text-muted-foreground">
                {crowd.isEstimated
                  ? "Tendance cotes"
                  : `${crowd.sampleSize} pronos`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <CrowdBar
              label={
                <>
                  <TeamFlag
                    name={match.home_team.name}
                    code={match.home_team.code}
                    logoUrl={match.home_team.logo_url}
                    teamId={match.home_team.id}
                    size={14}
                  />
                  {match.home_team.code ?? "Dom."}
                </>
              }
              pct={crowd.home}
              accentClass="bg-lime-400"
            />
            <CrowdBar label="Nul" pct={crowd.draw} accentClass="bg-fuchsia-400" />
            <CrowdBar
              label={
                <>
                  <TeamFlag
                    name={match.away_team.name}
                    code={match.away_team.code}
                    logoUrl={match.away_team.logo_url}
                    teamId={match.away_team.id}
                    size={14}
                  />
                  {match.away_team.code ?? "Ext."}
                </>
              }
              pct={crowd.away}
              accentClass="bg-sky-400"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-lime-400/25 bg-lime-400/5 p-3">
          <div className="flex items-center gap-2">
            <Brain className="size-4 shrink-0 text-lime-400" aria-hidden />
            <p className="text-xs font-semibold">L&apos;Oracle IA</p>
          </div>
          <p className="text-sm leading-snug text-foreground">
            L&apos;IA pronostique :{" "}
            <span className="font-semibold text-lime-300">{aiLabel}</span>
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2">
            <History className="size-4 shrink-0 text-amber-400" aria-hidden />
            <p className="text-xs font-semibold">Ton Historique</p>
          </div>
          {personalInsight ? (
            <p className="text-sm leading-snug text-amber-100/90">{personalInsight}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pas assez de matchs passés pour un signal personnel — fonce !
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
