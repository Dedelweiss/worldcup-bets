"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { resetPackCoinsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ResetPackCoinsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (
      !window.confirm(
        "Remettre à zéro les jetons d'achat de packs de TOUS les joueurs ? Les points de classement ne sont pas touchés.",
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await resetPackCoinsAction();

    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`Jetons remis à zéro pour ${result.count} joueur(s)`);
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
        onClick={() => void handleReset()}
        className="gap-1.5"
      >
        <Coins className="size-3.5" />
        Reset jetons packs
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
