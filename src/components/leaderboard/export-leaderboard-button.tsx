"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildLeaderboardShareMeta,
  leaderboardExportFilename,
} from "@/lib/leaderboard/leaderboard-export";
import { renderLeaderboardImage } from "@/lib/leaderboard/render-leaderboard-image";
import {
  FutCardShareCancelledError,
  shareOrDownloadFutCard,
} from "@/lib/profile/export-fut-card-image";
import { cn } from "@/lib/utils";
import type {
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSort,
} from "@/types/database";

interface ExportLeaderboardButtonProps {
  players: LeaderboardEntry[];
  scope: LeaderboardScope;
  sort: LeaderboardSort;
  leagueName?: string | null;
  className?: string;
}

export function ExportLeaderboardButton({
  players,
  scope,
  sort,
  leagueName,
  className,
}: ExportLeaderboardButtonProps) {
  const exportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  if (players.length === 0) return null;

  async function handleExport() {
    if (exportingRef.current) return;

    exportingRef.current = true;
    setIsExporting(true);

    try {
      const meta = buildLeaderboardShareMeta(players, {
        scope,
        sort,
        leagueName,
      });
      const blob = await renderLeaderboardImage(meta);
      const filename = leaderboardExportFilename(scope, leagueName);
      const result = await shareOrDownloadFutCard(blob, filename);

      if (result === "shared") {
        toast.success("Classement prêt — partagez l'image.");
      } else {
        toast.success("Image du classement téléchargée.");
      }
    } catch (error) {
      if (error instanceof FutCardShareCancelledError) return;
      if (process.env.NODE_ENV === "development") {
        console.error("[ExportLeaderboardButton]", error);
      }
      toast.error("Impossible d'exporter le classement.");
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
      onClick={() => void handleExport()}
      className={cn(
        "group relative overflow-hidden border-amber-400/35 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-600/10 text-amber-100 shadow-sm transition-all hover:border-amber-300/50 hover:from-amber-500/20 hover:to-orange-500/15 hover:shadow-md hover:shadow-amber-500/10",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(251,191,36,0.12)_50%,transparent_75%)] opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      {isExporting ? (
        <Loader2 className="relative size-4 animate-spin" aria-hidden />
      ) : (
        <Trophy className="relative size-4 text-amber-300" aria-hidden />
      )}
      <span className="relative font-medium">Exporter le classement</span>
      {!isExporting && (
        <Download className="relative size-3.5 opacity-70" aria-hidden />
      )}
    </Button>
  );
}
