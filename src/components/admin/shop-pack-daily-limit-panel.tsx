"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { setShopPackDailyLimitAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopPackDailyLimitPanel({
  dailyLimit,
}: {
  dailyLimit: number;
}) {
  const router = useRouter();
  const [limit, setLimit] = useState(String(dailyLimit));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);

    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Entrez un entier ≥ 0 (0 = illimité).");
      setLoading(false);
      return;
    }

    const result = await setShopPackDailyLimitAction(parsed);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setFeedback(
      parsed === 0
        ? "Achats de packs illimités activés."
        : `Limite fixée à ${parsed} pack${parsed > 1 ? "s" : ""} / jour / joueur.`,
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="size-4" aria-hidden />
          Limite d&apos;achat packs (boutique)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Nombre maximum de packs qu&apos;un joueur peut acheter par jour dans la
          boutique (fuseau Europe/Paris). Mettez 0 pour désactiver la limite.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex max-w-xs flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="pack-daily-limit">Packs / jour / joueur</Label>
            <Input
              id="pack-daily-limit"
              type="number"
              min={0}
              step={1}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="h-9 bg-background"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {feedback && <p className="text-sm text-primary">{feedback}</p>}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
