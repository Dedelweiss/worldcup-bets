"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resetPlayerAlbumAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";
import type { CollectionPlayerRow } from "@/lib/admin/collection";

export function ResetPlayerAlbumPanel({
  players,
}: {
  players: CollectionPlayerRow[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [resetCoins, setResetCoins] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = players.find((p) => p.id === userId);

  async function handleReset() {
    if (!userId || !selected) return;

    const coinsNote = resetCoins
      ? " Les jetons seront aussi remis à zéro."
      : " Les jetons ne seront pas touchés.";

    if (
      !window.confirm(
        `Supprimer l'album de ${playerLabel(selected)} ?` +
          ` (${selected.ownedCards} carte(s), ${selected.unopenedPacks} pack(s) non ouvert(s), ${formatPoints(selected.card_shards)} éclats).` +
          coinsNote,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await resetPlayerAlbumAction(userId, resetCoins);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        `Album réinitialisé : ${result.summary?.cards_removed ?? 0} entrée(s) collection, ` +
          `${result.summary?.packs_removed ?? 0} pack(s), ` +
          `${result.summary?.openings_removed ?? 0} ouverture(s).`,
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reset album joueur</CardTitle>
        <p className="text-xs text-muted-foreground">
          Supprime la collection, les packs non ouverts et l&apos;historique
          d&apos;ouverture. Remet les éclats et le compteur pity à zéro.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="album-userId">Joueur</Label>
          <Select
            id="album-userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-8 bg-background"
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {playerLabel(p)} — {p.ownedCards} cartes · {p.unopenedPacks}{" "}
                packs
              </option>
            ))}
          </Select>
        </div>

        {selected && (
          <dl className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-raised)]/40 p-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Cartes possédées</dt>
              <dd className="font-semibold tabular-nums">{selected.ownedCards}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Packs en attente</dt>
              <dd className="font-semibold tabular-nums">
                {selected.unopenedPacks}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Éclats</dt>
              <dd className="font-semibold tabular-nums">
                {formatPoints(selected.card_shards)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jetons</dt>
              <dd className="font-semibold tabular-nums">
                {formatPoints(selected.pack_coins)}
              </dd>
            </div>
          </dl>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={resetCoins}
            onChange={(e) => setResetCoins(e.target.checked)}
            className="size-4 rounded border-[var(--color-line)]"
          />
          Remettre aussi les jetons à zéro
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}

        <Button
          type="button"
          variant="destructive"
          disabled={!userId || loading}
          onClick={() => void handleReset()}
        >
          {loading ? "Réinitialisation…" : "Reset album"}
        </Button>
      </CardContent>
    </Card>
  );
}

function playerLabel(player: CollectionPlayerRow): string {
  return player.display_name ?? player.username ?? player.id.slice(0, 8);
}
