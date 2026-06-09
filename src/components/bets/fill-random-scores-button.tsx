"use client";

import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";
import { toast } from "sonner";
import { fillRandomClassicScoresAction } from "@/app/(app)/matches/actions";
import { ConfirmActionButton } from "@/components/ui/confirm-dialog";

interface FillRandomScoresButtonProps {
  missingCount: number;
}

export function FillRandomScoresButton({
  missingCount,
}: FillRandomScoresButtonProps) {
  const router = useRouter();

  if (missingCount <= 0) return null;

  async function handleConfirm() {
    const result = await fillRandomClassicScoresAction();

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (result.placed === 0 && result.failed === 0) {
      toast.message("Tous vos matchs ont déjà un pronostic.");
    } else if (result.failed > 0) {
      toast.warning(
        `${result.placed} pronostic${result.placed > 1 ? "s" : ""} ajouté${result.placed > 1 ? "s" : ""}, ${result.failed} échec${result.failed > 1 ? "s" : ""}.`,
      );
    } else {
      toast.success(
        `${result.placed} score${result.placed > 1 ? "s" : ""} exact${result.placed > 1 ? "s" : ""} aléatoire${result.placed > 1 ? "s" : ""} enregistré${result.placed > 1 ? "s" : ""}.`,
      );
    }

    router.refresh();
  }

  return (
    <ConfirmActionButton
      title="Scores aléatoires"
      description={`Remplir ${missingCount} match${missingCount > 1 ? "s" : ""} sans pronostic avec des scores exacts aléatoires ?\n\nUn score différent sera tiré pour chaque match. Vous pourrez modifier chaque pronostic avant le coup d'envoi.`}
      confirmLabel="Tirer les scores"
      className="w-full border-lime-400/30 bg-lime-400/5 text-lime-200 hover:bg-lime-400/10 hover:text-lime-100 sm:w-auto"
      onConfirm={handleConfirm}
    >
      <Dices aria-hidden />
      Scores aléatoires ({missingCount})
    </ConfirmActionButton>
  );
}
