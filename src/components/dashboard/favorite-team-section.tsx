"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Lock, Trophy } from "lucide-react";
import { setFavoriteTeamAction } from "@/app/(app)/dashboard/favorite-team-actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPoints } from "@/lib/format";
import type { ProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import type { TournamentConfig } from "@/lib/tournament/config";
import type { TournamentTeam } from "@/types/database";

interface FavoriteTeamSectionProps {
  teams: TournamentTeam[];
  favorite: ProfileFavoriteTeam | null;
  config: TournamentConfig;
  isDemo?: boolean;
}

export function FavoriteTeamSection({
  teams,
  favorite,
  config,
  isDemo,
}: FavoriteTeamSectionProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bonusPts = config.favoriteTeamBonusPoints;

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q),
    );
  }, [teams, query]);

  const selectedTeam = teams.find((t) => t.id === Number(selectedId));

  async function handleConfirm() {
    const id = Number(selectedId);
    if (!id || isDemo) return;
    setLoading(true);
    setError(null);
    const result = await setFavoriteTeamAction(id);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  if (favorite) {
    const won =
      config.favoriteBonusSettled &&
      config.worldCupWinnerTeamId === favorite.team.id;
    const lost =
      config.favoriteBonusSettled &&
      config.worldCupWinnerTeamId != null &&
      config.worldCupWinnerTeamId !== favorite.team.id;

    return (
      <div className="flex h-full min-h-[120px] flex-col justify-center rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-500/5 to-transparent p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Heart className="size-3.5 fill-rose-500 text-rose-500" aria-hidden />
          Équipe favorite
        </p>
        <div className="mt-3 flex items-center gap-3">
          <TeamFlag
            name={favorite.team.name}
            code={favorite.team.code}
            logoUrl={favorite.team.logo_url}
            size={48}
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-tight">
              {favorite.team.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choix définitif · +{formatPoints(bonusPts)} pts si champion
            </p>
          </div>
          <Lock
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </div>
        {won && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-primary">
            <Trophy className="size-3.5 shrink-0" aria-hidden />
            Champion — bonus reçu !
          </p>
        )}
        {lost && config.worldCupWinnerTeam && (
          <p className="mt-2 text-xs text-muted-foreground">
            Vainqueur : {config.worldCupWinnerTeam.name}
          </p>
        )}
      </div>
    );
  }

  if (config.favoriteBonusSettled) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 text-center text-sm text-muted-foreground">
        Choix d&apos;équipe favorite fermés.
      </div>
    );
  }

  if (isDemo) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground">
        Équipe favorite disponible avec Supabase.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[120px] flex-col rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Heart className="size-3.5 text-rose-500" aria-hidden />
        Équipe favorite
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Un seul choix · +{formatPoints(bonusPts)} pts si la CDM
      </p>

      {!confirmOpen ? (
        <div className="mt-3 flex flex-1 flex-col gap-2">
          <Input
            type="search"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-sm"
            aria-label="Rechercher une équipe"
          />
          <Select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setError(null);
            }}
            className="bg-background"
            aria-label="Choisir une équipe"
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
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!selectedId}
            onClick={() => setConfirmOpen(true)}
          >
            Valider mon choix
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {selectedTeam && (
            <div className="flex items-center gap-2">
              <TeamFlag
                name={selectedTeam.name}
                code={selectedTeam.code}
                logoUrl={selectedTeam.logo_url}
                size={36}
              />
              <p className="text-sm font-medium">{selectedTeam.name}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Choix <strong>irréversible</strong>.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={() => setConfirmOpen(false)}
            >
              Retour
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading ? "…" : "Confirmer"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
