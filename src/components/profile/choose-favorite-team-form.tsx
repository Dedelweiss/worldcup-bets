"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Heart } from "lucide-react";
import { setFavoriteTeamAction } from "@/app/(app)/dashboard/favorite-team-actions";
import { FavoriteTeamPicker } from "@/components/profile/favorite-team-picker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatPoints } from "@/lib/format";
import type { TournamentTeam } from "@/types/database";

interface ChooseFavoriteTeamFormProps {
  teams: TournamentTeam[];
  bonusPoints: number;
}

export function ChooseFavoriteTeamForm({
  teams,
  bonusPoints,
}: ChooseFavoriteTeamFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [selectedId, setSelectedId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === Number(selectedId));

  async function handleConfirm() {
    const id = Number(selectedId);
    if (!id) return;

    setLoading(true);
    setError(null);
    const result = await setFavoriteTeamAction(id);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      setConfirmOpen(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10">
          <Heart className="size-7 fill-rose-500 text-rose-500" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">Choisissez votre équipe favorite</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Obligatoire pour continuer · choix définitif · +
          {formatPoints(bonusPoints)} pts si champion du monde
        </p>
      </div>

      <FavoriteTeamPicker
        teams={teams}
        value={selectedId}
        onChange={(id) => {
          setSelectedId(id);
          setError(null);
        }}
        disabled={loading}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={!selectedId || loading}
        onClick={() => setConfirmOpen(true)}
      >
        Valider mon choix
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmer votre équipe"
        description={
          selectedTeam
            ? `${selectedTeam.name} — ce choix est irréversible.`
            : "Ce choix est irréversible."
        }
        confirmLabel="Confirmer"
        cancelLabel="Retour"
        loading={loading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!loading) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
