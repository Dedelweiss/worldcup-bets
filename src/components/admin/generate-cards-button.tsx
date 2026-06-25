"use client";

import { useState } from "react";
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

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await generatePlayerCardsAction();

    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        `${result.cards} carte(s) joueur · effectifs en cache ${result.withSquad}/${result.tournamentTeams} (sync +${result.squadsSynced})`,
      );
      if (result.cards === 0 && result.withSquad === 0) {
        setError(
          result.squadError ??
            "Aucun effectif disponible côté football-data.org. Vérifiez FOOTBALL_DATA_API_KEY et que les équipes sont liées (football_data_id).",
        );
      }
      router.refresh();
    }

    setLoading(false);
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
        Générer les cartes joueurs
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
