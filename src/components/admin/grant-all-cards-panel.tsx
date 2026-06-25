"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { grantAllCardsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CollectionPlayerRow } from "@/lib/admin/collection";

export function GrantAllCardsPanel({
  players,
  totalCatalogCards,
}: {
  players: CollectionPlayerRow[];
  totalCatalogCards: number;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = players.find((p) => p.id === userId);

  async function handleGrant() {
    if (!userId || !selected) return;

    if (
      !window.confirm(
        `Donner toutes les cartes du catalogue à ${playerLabel(selected)} ? ` +
          `(${totalCatalogCards} cartes au total, ${selected.ownedCards} déjà possédées)`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await grantAllCardsAction(userId);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        `${result.granted} nouvelle(s) carte(s). ` +
          `Album : ${result.ownedTotal}/${result.catalogTotal} cartes valides.`,
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donner tout l&apos;album (test)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Ajoute les cartes valides du catalogue (max 1000). Consolide
          automatiquement le catalogue avant attribution (supprime fantômes et
          excédent).
        </p>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="grant-userId">Joueur</Label>
          <Select
            id="grant-userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-8 bg-background"
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {playerLabel(p)} — {p.ownedCards}/{totalCatalogCards} cartes
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}

        <Button
          type="button"
          disabled={!userId || loading}
          onClick={() => void handleGrant()}
        >
          {loading ? "Attribution…" : "Donner toutes les cartes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function playerLabel(player: CollectionPlayerRow): string {
  return player.display_name ?? player.username ?? player.id.slice(0, 8);
}
