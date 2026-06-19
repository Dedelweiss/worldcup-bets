"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold">Quelque chose s&apos;est mal passé</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "Une erreur inattendue s’est produite. Vos paris sont en sécurité."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground/60">#{error.digest}</p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/")}>
          Retour à l&apos;accueil
        </Button>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </div>
  );
}
