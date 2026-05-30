"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resetAppAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CONFIRM_PHRASE = "RESET";

export function ResetAppPanel() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleteMatches, setDeleteMatches] = useState(false);
  const [startingBalance, setStartingBalance] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleReset() {
    if (confirm !== CONFIRM_PHRASE) {
      setError(`Tapez ${CONFIRM_PHRASE} pour confirmer.`);
      return;
    }

    const msg = deleteMatches
      ? "Supprimer TOUS les matchs, paris, transactions et remettre chaque joueur à 100 € ?"
      : "Effacer tous les paris et transactions, remettre les scores à zéro et chaque joueur à 100 € ?";

    if (!window.confirm(msg)) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await resetAppAction({
      deleteMatches,
      startingBalance: Number(startingBalance) || 100,
    });

    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }

    const s = res.summary;
    setResult(
      `Réinitialisation OK — ${s?.bets_deleted ?? 0} pari(s) supprimé(s), ${s?.profiles_reset ?? 0} joueur(s) à ${s?.starting_balance ?? 100} €.`,
    );
    setConfirm("");
    router.refresh();
    setLoading(false);
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Zone de test</CardTitle>
        <p className="text-xs text-muted-foreground">
          Remet les bankrolls, efface paris et transactions. Option pour supprimer
          aussi les matchs. Réservé aux tests avant l&apos;arrivée des joueurs.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startingBalance">Solde de départ (€)</Label>
            <Input
              id="startingBalance"
              type="number"
              min={0}
              step="1"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={deleteMatches}
                onChange={(e) => setDeleteMatches(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Supprimer tous les matchs (et paris fun)
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmReset">
            Confirmation — tapez <strong>{CONFIRM_PHRASE}</strong>
          </Label>
          <Input
            id="confirmReset"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-primary">{result}</p>}

        <Button
          type="button"
          variant="destructive"
          disabled={loading || confirm !== CONFIRM_PHRASE}
          onClick={handleReset}
        >
          {loading ? "Réinitialisation…" : "Réinitialiser toute l'application"}
        </Button>
      </CardContent>
    </Card>
  );
}
