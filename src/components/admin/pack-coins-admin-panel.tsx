"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adjustCardShardsAction,
  adjustPackCoinsAction,
  resetCardShardsAction,
  resetPackCoinsAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";
import type { CollectionPlayerRow } from "@/lib/admin/collection";

export function PackCoinsAdminPanel({
  players,
}: {
  players: CollectionPlayerRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GrantPackCoinsForm players={players} />
      <ResetPackCoinsPanel players={players} />
      <GrantCardShardsForm players={players} />
      <ResetCardShardsPanel players={players} />
    </div>
  );
}

function GrantPackCoinsForm({ players }: { players: CollectionPlayerRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await adjustPackCoinsAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        `Nouveau solde : ${formatPoints(result.newBalance ?? 0)} jetons`,
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donner des jetons</CardTitle>
        <p className="text-xs text-muted-foreground">
          Crédite ou débite les jetons d&apos;achat de packs d&apos;un joueur
          (sans toucher aux points de classement).
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grant-userId">Joueur</Label>
            <Select
              id="grant-userId"
              name="userId"
              required
              className="h-8 bg-background"
            >
              <option value="">Choisir…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {playerLabel(p)} — {formatPoints(p.pack_coins)} jetons
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grant-amount">Jetons (+ / −)</Label>
            <Input
              id="grant-amount"
              name="amount"
              type="number"
              step="1"
              required
              placeholder="100 ou -50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grant-reason">Motif (optionnel)</Label>
            <Input
              id="grant-reason"
              name="reason"
              placeholder="Bonus événement"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Application…" : "Appliquer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ResetPackCoinsPanel({ players }: { players: CollectionPlayerRow[] }) {
  const router = useRouter();
  const [globalLoading, setGlobalLoading] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  async function handleGlobalReset() {
    if (
      !window.confirm(
        "Remettre à zéro les jetons de TOUS les joueurs ? Les points de classement ne sont pas touchés.",
      )
    ) {
      return;
    }

    setGlobalLoading(true);
    setMessage(null);
    setError(null);

    const result = await resetPackCoinsAction();
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`Jetons remis à zéro pour ${result.count} joueur(s)`);
      router.refresh();
    }
    setGlobalLoading(false);
  }

  async function handlePlayerReset() {
    if (!userId) return;
    const player = players.find((p) => p.id === userId);
    if (
      !window.confirm(
        `Remettre à zéro les jetons de ${playerLabel(player)} ?`,
      )
    ) {
      return;
    }

    setPlayerLoading(true);
    setMessage(null);
    setError(null);

    const result = await resetPackCoinsAction(userId);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`Jetons remis à zéro pour ${playerLabel(player)}`);
      router.refresh();
    }
    setPlayerLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reset jetons packs</CardTitle>
        <p className="text-xs text-muted-foreground">
          Remet les jetons d&apos;achat à zéro (global ou par joueur). Les
          cartes et packs en inventaire ne sont pas supprimés.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          disabled={globalLoading || playerLoading}
          onClick={() => void handleGlobalReset()}
        >
          {globalLoading ? "Reset…" : "Reset jetons — tous les joueurs"}
        </Button>

        <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
          <Label htmlFor="reset-userId">Reset pour un joueur</Label>
          <Select
            id="reset-userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-8 bg-background"
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {playerLabel(p)} — {formatPoints(p.pack_coins)} jetons
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!userId || globalLoading || playerLoading}
            onClick={() => void handlePlayerReset()}
          >
            {playerLoading ? "Reset…" : "Reset jetons — ce joueur"}
          </Button>
        </div>

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function playerLabel(
  player: CollectionPlayerRow | undefined,
): string {
  if (!player) return "Joueur";
  return (
    player.display_name ??
    player.username ??
    player.id.slice(0, 8)
  );
}

function GrantCardShardsForm({ players }: { players: CollectionPlayerRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await adjustCardShardsAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        `Nouveau solde : ${formatPoints(result.newBalance ?? 0)} éclats`,
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donner des éclats</CardTitle>
        <p className="text-xs text-muted-foreground">
          Crédite ou débite les éclats d&apos;un joueur (doublons recyclés,
          boutique premium).
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shard-grant-userId">Joueur</Label>
            <Select
              id="shard-grant-userId"
              name="userId"
              required
              className="h-8 bg-background"
            >
              <option value="">Choisir…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {playerLabel(p)} — {formatPoints(p.card_shards)} éclats
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shard-grant-amount">Éclats (+ / −)</Label>
            <Input
              id="shard-grant-amount"
              name="amount"
              type="number"
              step="1"
              required
              placeholder="100 ou -50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shard-grant-reason">Motif (optionnel)</Label>
            <Input
              id="shard-grant-reason"
              name="reason"
              placeholder="Bonus test"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Application…" : "Appliquer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ResetCardShardsPanel({ players }: { players: CollectionPlayerRow[] }) {
  const router = useRouter();
  const [globalLoading, setGlobalLoading] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  async function handleGlobalReset() {
    if (
      !window.confirm(
        "Remettre à zéro les éclats de TOUS les joueurs ? Les cartes et jetons ne sont pas touchés.",
      )
    ) {
      return;
    }

    setGlobalLoading(true);
    setMessage(null);
    setError(null);

    const result = await resetCardShardsAction();
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`Éclats remis à zéro pour ${result.count} joueur(s)`);
      router.refresh();
    }
    setGlobalLoading(false);
  }

  async function handlePlayerReset() {
    if (!userId) return;
    const player = players.find((p) => p.id === userId);
    if (
      !window.confirm(
        `Remettre à zéro les éclats de ${playerLabel(player)} ?`,
      )
    ) {
      return;
    }

    setPlayerLoading(true);
    setMessage(null);
    setError(null);

    const result = await resetCardShardsAction(userId);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`Éclats remis à zéro pour ${playerLabel(player)}`);
      router.refresh();
    }
    setPlayerLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reset éclats</CardTitle>
        <p className="text-xs text-muted-foreground">
          Remet les éclats à zéro (global ou par joueur). N&apos;affecte ni les
          cartes ni les jetons.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          disabled={globalLoading || playerLoading}
          onClick={() => void handleGlobalReset()}
        >
          {globalLoading ? "Reset…" : "Reset éclats — tous les joueurs"}
        </Button>

        <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
          <Label htmlFor="shard-reset-userId">Reset pour un joueur</Label>
          <Select
            id="shard-reset-userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-8 bg-background"
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {playerLabel(p)} — {formatPoints(p.card_shards)} éclats
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!userId || globalLoading || playerLoading}
            onClick={() => void handlePlayerReset()}
          >
            {playerLoading ? "Reset…" : "Reset éclats — ce joueur"}
          </Button>
        </div>

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
