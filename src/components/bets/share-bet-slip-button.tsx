"use client";

import { useRef, useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BetSlipShareCard } from "@/components/bets/bet-slip-share-card";
import { Button } from "@/components/ui/button";
import {
  betSlipExportFilename,
  mapBetsToShareLines,
  selectBetsForSlipShare,
} from "@/lib/bets/bet-slip-share";
import {
  captureFutCardImage,
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
  const exportRef = useRef<HTMLDivElement>(null);
  const exportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  const shareBets = selectBetsForSlipShare(bets);
  const lines = mapBetsToShareLines(shareBets);

  if (shareBets.length === 0) return null;

  async function handleShare() {
    const node = exportRef.current;
    if (!node || exportingRef.current) return;

    exportingRef.current = true;
    setIsExporting(true);
    try {
      const blob = await captureFutCardImage(node);
      const filename = betSlipExportFilename(playerName);
      const result = await shareOrDownloadFutCard(blob, filename);

      if (result === "shared") {
        toast.success("Slip prêt — partagez en story ou WhatsApp.");
      } else {
        toast.success("Image téléchargée.");
      }
    } catch (error) {
      if (error instanceof FutCardShareCancelledError) return;
      toast.error("Impossible d'exporter le slip.");
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  }

  return (
    <>
      <div
        ref={exportRef}
        className="pointer-events-none fixed -left-[9999px] top-0 opacity-0"
        aria-hidden
      >
        <BetSlipShareCard
          playerName={playerName}
          lines={lines}
          onFire={onFire}
        />
      </div>

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
    </>
  );
}
