"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustBalanceAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";

interface PlayerOption {
  id: string;
  display_name: string | null;
  username: string | null;
  points: number;
}

export function BalanceAdjustForm({ players }: { players: PlayerOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await adjustBalanceAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        `Nouveau total : ${formatPoints(result.newBalance ?? 0)} points`,
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajuster les points</CardTitle>
        <p className="text-xs text-muted-foreground">
          Montant positif = bonus · négatif = malus (ex: -20)
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="userId">Joueur</Label>
            <select
              id="userId"
              name="userId"
              required
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">Choisir…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? p.username ?? p.id.slice(0, 8)} —{" "}
                  {formatPoints(p.points)} pts
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Points (+ / −)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="1"
              required
              placeholder="50 ou -20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Input id="reason" name="reason" placeholder="Bonus fair-play" />
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
