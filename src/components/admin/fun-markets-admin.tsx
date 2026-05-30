"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createFunMarketAction,
  settleFunMarketAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatOdd } from "@/lib/format";
import type { FunMarket } from "@/types/database";

interface FunMarketsAdminProps {
  matchId: number;
  markets: FunMarket[];
}

export function FunMarketsAdmin({ matchId, markets }: FunMarketsAdminProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createFunMarketAction(new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setLoading(false);
  }

  async function handleSettle(marketId: string, outcome: "yes" | "no") {
    if (!confirm(`Clôturer ce pari fun avec « ${outcome === "yes" ? "Oui" : "Non"} » gagnant ?`))
      return;
    setLoading(true);
    const result = await settleFunMarketAction(marketId, outcome, matchId);
    if (!result.success) setError(result.error);
    else router.refresh();
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paris fun</CardTitle>
        <p className="text-xs text-muted-foreground">
          Restent ouverts après le coup d&apos;envoi jusqu&apos;à clôture manuelle.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-dashed p-4">
          <input type="hidden" name="matchId" value={matchId} />
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              name="question"
              required
              placeholder="Y aura-t-il plus de 10 corners ?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="oddYes">Cote Oui</Label>
              <Input id="oddYes" name="oddYes" type="number" step="0.01" min="1.01" defaultValue="2.5" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oddNo">Cote Non</Label>
              <Input id="oddNo" name="oddNo" type="number" step="0.01" min="1.01" defaultValue="1.6" required />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            Ajouter le pari fun
          </Button>
        </form>

        {markets.length > 0 && (
          <ul className="space-y-3">
            {markets.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {m.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-medium">{m.question}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Oui {formatOdd(m.odd_yes)} · Non {formatOdd(m.odd_no)}
                  </p>
                </div>
                {m.status === "open" && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSettle(m.id, "yes")}
                    >
                      Oui gagne
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSettle(m.id, "no")}
                    >
                      Non gagne
                    </Button>
                  </div>
                )}
                {m.status === "settled" && (
                  <span className="text-sm text-primary">
                    → {m.winning_outcome === "yes" ? "Oui" : "Non"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
