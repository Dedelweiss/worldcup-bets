"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr" className="dark h-full">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Une erreur inattendue s&apos;est produite</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error.message || "Quelque chose s&apos;est mal passé. Essayez de recharger la page."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/60">#{error.digest}</p>
        )}
        <Button onClick={reset}>Réessayer</Button>
      </body>
    </html>
  );
}
