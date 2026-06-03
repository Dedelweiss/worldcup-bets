"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncFootballDataAdminAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FootballDataSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    setWarning(null);
    setError(null);

    const result = await syncFootballDataAdminAction();

    if (!result.success) {
      setError(result.error);
    } else if (result.stats) {
      const fd = result.stats.footballData;
      const odds = result.stats.oddsApi;
      const parts: string[] = [];
      if (fd) {
        parts.push(
          `live ${fd.updated} match(s) · ${fd.apiCalls} req football-data`,
        );
      }
      if (odds) {
        parts.push(
          `${odds.oddsUpdated} cote(s) · ${odds.apiCalls} req odds-api`,
        );
      }
      setMessage(parts.join(" · ") || "Sync terminée");
      if (result.stats.warning) {
        setWarning(result.stats.warning);
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
        onClick={() => void handleSync()}
        className="gap-1.5"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        Sync live + cotes API
      </Button>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      {warning && (
        <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
          {warning}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
