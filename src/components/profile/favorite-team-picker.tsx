"use client";

import { useMemo, useState } from "react";
import { TeamFlag } from "@/components/shared/team-flag";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TournamentTeam } from "@/types/database";

interface FavoriteTeamPickerProps {
  teams: TournamentTeam[];
  value: string;
  onChange: (teamId: string) => void;
  disabled?: boolean;
  id?: string;
}

export function FavoriteTeamPicker({
  teams,
  value,
  onChange,
  disabled,
  id = "favorite-team",
}: FavoriteTeamPickerProps) {
  const [query, setQuery] = useState("");

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q),
    );
  }, [teams, query]);

  const selectedTeam = teams.find((t) => t.id === Number(value));

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Rechercher une équipe…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 text-sm"
        disabled={disabled}
        aria-label="Rechercher une équipe"
      />
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background"
        disabled={disabled}
        aria-label="Choisir une équipe favorite"
        required
      >
        <option value="">— Sélectionner —</option>
        {filteredTeams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.tournament_group?.letter
              ? ` (Groupe ${t.tournament_group.letter})`
              : ""}
          </option>
        ))}
      </Select>
      {selectedTeam && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <TeamFlag
            name={selectedTeam.name}
            code={selectedTeam.code}
            logoUrl={selectedTeam.logo_url}
            size={32}
          />
          <span className="text-sm font-medium">{selectedTeam.name}</span>
        </div>
      )}
    </div>
  );
}
