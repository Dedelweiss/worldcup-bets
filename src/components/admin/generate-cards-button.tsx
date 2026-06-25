"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { generatePlayerCardsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GenerateCardsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  async function handleGenerate() {
    if (runningRef.current || loading) return;
    runningRef.current = true;
    setLoading(true);
    setMessage("Synchronisation des effectifs et génération en cours…");
    setError(null);

    try {
      const result = await generatePlayerCardsAction();

      if (!result.success) {
        setMessage(null);
        setError(result.error);
        return;
      }

      setMessage(
        `${result.cards} joueur(s) · ${result.specialCards} spéciale(s) · catalogue ${result.catalogTotal}/1000` +
          (result.skipped > 0 ? ` · ${result.skipped} hors quota` : "") +
          (result.shirtsEnriched
            ? ` · numéros +${result.shirtsEnriched} équipe(s)`
            : "") +
          (result.shirtsRemaining
            ? ` · ${result.shirtsRemaining} équipe(s) numéros en attente (relancez)`
            : "") +
          ` · effectifs ${result.withSquad}/${result.tournamentTeams}`,
      );

      if (result.cards === 0 && result.withSquad === 0) {
        setError(
          result.squadError ??
            "Aucun effectif disponible côté football-data.org. Vérifiez FOOTBALL_DATA_API_KEY et que les équipes sont liées (football_data_id).",
        );
      }

      router.refresh();
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void handleGenerate()}
        className="gap-1.5"
      >
        <Layers className={cn("size-3.5", loading && "animate-pulse")} />
        {loading ? "Génération en cours…" : "Générer les cartes joueurs"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
