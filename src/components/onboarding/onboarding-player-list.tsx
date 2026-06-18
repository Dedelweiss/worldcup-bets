"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { TeamFlag } from "@/components/shared/team-flag";
import { Input } from "@/components/ui/input";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";
import type { OnboardingPlayerOption } from "@/lib/onboarding/types";

interface OnboardingPlayerListProps {
  players: OnboardingPlayerOption[];
  value: number | null;
  onChange: (player: OnboardingPlayerOption) => void;
  disabled?: boolean;
  accentClass?: string;
}

export function OnboardingPlayerList({
  players,
  value,
  onChange,
  disabled,
  accentClass = "text-primary",
}: OnboardingPlayerListProps) {
  const isClient = useIsClient();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players.slice(0, 80);
    return players
      .filter(
        (p) =>
          p.playerName.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q) ||
          p.teamCode?.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [players, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Input
        type="search"
        placeholder="Rechercher un joueur…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        className="h-11 shrink-0 bg-background/80"
        aria-label="Rechercher un joueur"
      />
      {!query.trim() && players.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tapez un nom pour afficher les joueurs ({players.length} dans les
          effectifs).
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <ul className="space-y-1.5">
          {filtered.map((player) => {
            const selected = value === player.playerId;
            const row = (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(player)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left backdrop-blur-sm transition-all",
                  "hover:border-white/20 hover:bg-white/5 active:scale-[0.99]",
                  selected
                    ? "border-white/30 bg-white/10 ring-1 ring-white/20"
                    : "border-border/50 bg-card/30",
                  disabled && "pointer-events-none opacity-60",
                )}
              >
                <TeamFlag
                  name={player.teamName}
                  code={player.teamCode}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {player.playerName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {player.teamName}
                    {player.position ? ` · ${player.position}` : ""}
                  </p>
                </div>
                {selected && (
                  <Check
                    className={cn("size-4 shrink-0", accentClass)}
                    aria-hidden
                  />
                )}
              </button>
            );

            if (!isClient) {
              return <li key={player.playerId}>{row}</li>;
            }

            return (
              <motion.li
                key={player.playerId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                {row}
              </motion.li>
            );
          })}
        </ul>
        {query.trim() && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun joueur trouvé.
          </p>
        )}
        {players.length === 0 && (
          <p className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-4 text-center text-sm text-amber-100/90">
            Effectifs non synchronisés — l&apos;admin peut lancer la sync des
            squads depuis le panneau admin.
          </p>
        )}
      </div>
    </div>
  );
}
