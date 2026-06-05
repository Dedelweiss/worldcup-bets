"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prepareWorldCupAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CONFIRM_PHRASE = "PREPARE WC";

export function PrepareWorldCupPanel() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [startingBalance, setStartingBalance] = useState("0");
  const [syncOdds, setSyncOdds] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handlePrepare() {
    if (confirm !== CONFIRM_PHRASE) {
      setError(`Tapez ${CONFIRM_PHRASE} pour confirmer.`);
      return;
    }

    if (
      !window.confirm(
        "Remettre tous les matchs CDM 2026 à « à venir », effacer paris/scores/chat et réinitialiser les joueurs ?",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await prepareWorldCupAction({
      startingBalance: Number(startingBalance) || 0,
      syncOddsAfter: syncOdds,
    });

    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }

    const s = res.summary;
    const sync = res.syncStats;
    let msg = `${s?.matches_prepared ?? 0} match(s) préparés · ${s?.bets_deleted ?? 0} pari(s) effacés · ${s?.profiles_reset ?? 0} joueur(s) remis à ${s?.starting_points ?? 0} pts.`;
    if (sync) {
      const oddsCount =
        sync.oddsApi?.oddsUpdated ?? sync.footballData?.oddsUpdated ?? 0;
      const apiCalls =
        (sync.oddsApi?.apiCalls ?? 0) + (sync.footballData?.apiCalls ?? 0);
      msg += ` Sync API : ${oddsCount} cote(s), ${apiCalls} requête(s).`;
      if (oddsCount === 0) {
        msg +=
          " (Vérifiez ODDS_API_KEY et le slug ligue CDM sur odds-api.io.)";
      }
    }
    setResult(msg);
    setConfirm("");
    router.refresh();
    setLoading(false);
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-base">Préparer la Coupe du monde</CardTitle>
        <p className="text-xs text-muted-foreground">
          Après vos tests : remet les matchs saison 2026 en « à venir », efface
          scores, paris, chat et messages IA, et remet tous les joueurs (y compris
          le pronostiqueur IA) au solde choisi. Les cotes seed (2,50 / 3,20 /
          2,80) sont effacées — lancez « Sync API matchs » pour les cotes
          odds-api.io. Pour restaurer le calendrier officiel, ré-exécutez{" "}
          <code className="text-[10px]">seed_wc2026_group_matches.sql</code> dans
          Supabase.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wcStartingBalance">Points de départ</Label>
            <Input
              id="wcStartingBalance"
              type="number"
              min={0}
              step="1"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={syncOdds}
              onChange={(e) => setSyncOdds(e.target.checked)}
              className="size-4 rounded border-border"
            />
            Récupérer les cotes via football-data après préparation
          </label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wcConfirm">Confirmation</Label>
          <Input
            id="wcConfirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || confirm !== CONFIRM_PHRASE}
          onClick={() => void handlePrepare()}
        >
          {loading ? "Préparation…" : "Préparer la CDM 2026"}
        </Button>
        {result && <p className="text-sm text-muted-foreground">{result}</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
