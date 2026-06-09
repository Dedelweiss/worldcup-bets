"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cancelAllNonLivePendingBetsAction } from "@/app/(app)/bets/actions";
import { ConfirmActionButton } from "@/components/ui/confirm-dialog";
import { canBulkCancelPendingBet } from "@/lib/bets/can-cancel-bet";
import type { BetRow } from "@/types/database";

interface CancelAllNonLiveBetsButtonProps {
  bets: BetRow[];
}

export function CancelAllNonLiveBetsButton({
  bets,
}: CancelAllNonLiveBetsButtonProps) {
  const router = useRouter();

  const cancellableCount = useMemo(
    () => bets.filter(canBulkCancelPendingBet).length,
    [bets],
  );

  if (cancellableCount <= 0) return null;

  async function handleConfirm() {
    const result = await cancelAllNonLivePendingBetsAction();

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
    <ConfirmActionButton
      title="Supprimer tous mes paris"
      description={`Supprimer ${cancellableCount} pari${cancellableCount > 1 ? "s" : ""} en attente sur des matchs qui ne sont pas en direct ?\n\nVos paris sur les matchs en cours seront conservés.`}
      confirmLabel="Supprimer"
      destructive
      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
      onConfirm={handleConfirm}
    >
      <Trash2 aria-hidden />
      Supprimer tous mes paris ({cancellableCount})
    </ConfirmActionButton>
  );
}
