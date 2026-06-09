"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cancelAllNonLivePendingBetsAction } from "@/app/(app)/bets/actions";
import { canBulkCancelPendingBet } from "@/lib/bets/can-cancel-bet";
import { Button } from "@/components/ui/button";
import type { BetRow } from "@/types/database";

interface CancelAllNonLiveBetsButtonProps {
  bets: BetRow[];
}

export function CancelAllNonLiveBetsButton({
  bets,
}: CancelAllNonLiveBetsButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const cancellableCount = useMemo(
    () => bets.filter(canBulkCancelPendingBet).length,
    [bets],
  );

  if (cancellableCount === 0) return null;

  async function handleClick() {
    if (
      !window.confirm(
        `Supprimer ${cancellableCount} pari${cancellableCount > 1 ? "s" : ""} en attente sur des matchs qui ne sont pas en direct ?\n\nVos paris sur les matchs en cours seront conservés.`,
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await cancelAllNonLivePendingBetsAction();
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (result.cancelled === 0 && result.failed === 0) {
      toast.message("Aucun pari à supprimer.");
    } else if (result.failed > 0) {
      toast.warning(
        `${result.cancelled} pari${result.cancelled > 1 ? "s" : ""} supprimé${result.cancelled > 1 ? "s" : ""}, ${result.failed} impossible${result.failed > 1 ? "s" : ""} à annuler.`,
      );
    } else {
      toast.success(
        `${result.cancelled} pari${result.cancelled > 1 ? "s" : ""} supprimé${result.cancelled > 1 ? "s" : ""}.`,
      );
    }

    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => void handleClick()}
      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          Suppression…
        </>
      ) : (
        <>
          <Trash2 aria-hidden />
          Supprimer tous mes paris ({cancellableCount})
        </>
      )}
    </Button>
  );
}
