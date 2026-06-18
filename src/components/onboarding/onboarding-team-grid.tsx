"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { TeamFlag } from "@/components/shared/team-flag";
import { Input } from "@/components/ui/input";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/types/database";

interface OnboardingTeamGridProps {
  teams: TournamentTeam[];
  value: number | null;
  onChange: (teamId: number) => void;
  disabled?: boolean;
  excludeTeamId?: number | null;
  accentClass?: string;
}

function teamButtonClass(selected: boolean, disabled?: boolean) {
  return cn(
    "relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center backdrop-blur-sm transition-colors",
    "hover:border-white/20 hover:bg-white/5 active:scale-[0.98]",
    selected
      ? "border-white/30 bg-white/10 ring-2 ring-white/20"
      : "border-border/50 bg-card/30",
    disabled && "pointer-events-none opacity-60",
  );
}

export function OnboardingTeamGrid({
  teams,
  value,
  onChange,
  disabled,
  excludeTeamId,
  accentClass = "text-primary",
}: OnboardingTeamGridProps) {
  const isClient = useIsClient();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = teams;
    if (excludeTeamId != null) {
      list = list.filter((t) => t.id !== excludeTeamId);
    }
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.tournament_group?.letter?.toLowerCase().includes(q),
    );
  }, [teams, query, excludeTeamId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Input
        type="search"
        placeholder="Rechercher une équipe…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        className="h-11 shrink-0 border-white/10 bg-background/60 backdrop-blur-sm"
        aria-label="Rechercher une équipe"
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((team, i) => {
            const selected = value === team.id;
            const content = (
              <>
                {selected && (
                  <span className={cn("absolute right-2 top-2", accentClass)}>
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
                <TeamFlag
                  name={team.name}
                  code={team.code}
                  logoUrl={team.logo_url}
                  size={40}
                />
                <span className="line-clamp-2 text-xs font-medium leading-tight">
                  {team.name}
                </span>
                {team.tournament_group?.letter && (
                  <span className="text-[10px] text-muted-foreground">
                    Groupe {team.tournament_group.letter}
                  </span>
                )}
              </>
            );

            if (!isClient) {
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(team.id)}
                  className={teamButtonClass(selected, disabled)}
                >
                  {content}
                </button>
              );
            }

            return (
              <motion.button
                key={team.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(team.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25 }}
                whileTap={{ scale: 0.96 }}
                className={teamButtonClass(selected, disabled)}
              >
                {content}
              </motion.button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune équipe trouvée.
          </p>
        )}
      </div>
    </div>
  );
}
