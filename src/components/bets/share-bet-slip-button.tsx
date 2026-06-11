"use client";

import { useRef, useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  betSlipExportFilename,
  mapBetsToShareLines,
  selectBetsForSlipShare,
} from "@/lib/bets/bet-slip-share";
import { renderBetSlipImage } from "@/lib/bets/render-bet-slip-image";
import {
  FutCardShareCancelledError,
  shareOrDownloadFutCard,
} from "@/lib/profile/export-fut-card-image";
import type { BetRow } from "@/types/database";

interface ShareBetSlipButtonProps {
  playerName: string;
  bets: BetRow[];
  onFire?: boolean;
}

export function ShareBetSlipButton({
  playerName,
  bets,
  onFire = false,
}: ShareBetSlipButtonProps) {
  const exportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  const shareBets = selectBetsForSlipShare(bets);

  if (shareBets.length === 0) return null;

  async function handleShare() {
    if (exportingRef.current) return;

    exportingRef.current = true;
    setIsExporting(true);
    try {
      const lines = mapBetsToShareLines(shareBets);
      const blob = await renderBetSlipImage({
        playerName,
        lines,
        onFire,
      });
      const filename = betSlipExportFilename(playerName);
      const result = await shareOrDownloadFutCard(blob, filename);

      if (result === "shared") {
        toast.success("Slip prêt — partagez en story ou WhatsApp.");
      } else {
        toast.success("Image téléchargée.");
      }
    } catch (error) {
      if (error instanceof FutCardShareCancelledError) return;
      if (process.env.NODE_ENV === "development") {
        console.error("[ShareBetSlipButton]", error);
      }
      toast.error("Impossible d'exporter le slip.");
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isExporting}
      onClick={() => void handleShare()}
      className="border-lime-400/30 bg-lime-400/5 text-lime-300 hover:bg-lime-400/10"
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Share2 className="size-4" aria-hidden />
      )}
      Partager mon slip
    </Button>
  );
}
