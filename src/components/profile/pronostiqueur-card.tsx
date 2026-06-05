"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Info, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  captureFutCardImage,
  futCardExportFilename,
  FutCardShareCancelledError,
  shareOrDownloadFutCard,
} from "@/lib/profile/export-fut-card-image";
import { getPlayerInitials, getPlayerLabel } from "@/lib/profile/player-label";
import type { FUTCardStats } from "@/lib/profile/calculate-fut-stats";
import { cn } from "@/lib/utils";
import type { Team } from "@/types/database";

const FUT_CARD_CLIP =
  "polygon(0% 6%, 6% 0%, 94% 0%, 100% 6%, 100% 94%, 94% 100%, 6% 100%, 0% 94%)";

interface PronostiqueurCardProps {
  playerName: string;
  avatarUrl: string | null;
  favoriteTeam: Team | null;
  futStats: FUTCardStats;
  className?: string;
  showShareButton?: boolean;
}

export function PronostiqueurCard({
  playerName,
  avatarUrl,
  favoriteTeam,
  futStats,
  className,
  showShareButton = true,
}: PronostiqueurCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const showAvatar = Boolean(avatarUrl?.trim()) && !imageFailed;
  const initials = getPlayerInitials({ username: playerName, display_name: playerName });

  async function handleShare() {
    const node = exportRef.current;
    if (!node || isExporting) return;

    setIsExporting(true);
    try {
      const blob = await captureFutCardImage(node);
      const filename = futCardExportFilename(playerName, futStats.ovr);
      const result = await shareOrDownloadFutCard(blob, filename);

      if (result === "shared") {
        toast.success("Carte prête — choisissez Instagram, Stories, etc.");
      } else {
        toast.success("Image téléchargée — importez-la dans Instagram ou Stories.");
      }
    } catch (error) {
      if (error instanceof FutCardShareCancelledError) return;
      if (process.env.NODE_ENV === "development") {
        console.error("[PronostiqueurCard] export failed:", error);
      }
      toast.error("Impossible d'exporter la carte. Réessayez dans un instant.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className={cn("flex w-full max-w-[280px] flex-col items-center gap-3", className)}>
    <motion.article
      className="relative mx-auto w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={isExporting ? undefined : { scale: 1.02, y: -4 }}
      aria-label={`Carte pronostiqueur ${getPlayerLabel({ username: playerName, display_name: playerName })} — OVR ${futStats.ovr}`}
    >
      <div
        ref={exportRef}
        className="relative overflow-hidden p-[2px] [&[data-exporting]_[data-export-ignore]]:invisible"
        style={{ clipPath: FUT_CARD_CLIP }}
      >
        <motion.div
          data-export-animate
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "conic-gradient(from 210deg at 50% 50%, rgba(204,255,0,0.45), rgba(217,70,239,0.35), rgba(163,230,53,0.2), rgba(204,255,0,0.45))",
          }}
          animate={isExporting ? { rotate: 0 } : { rotate: [0, 360] }}
          transition={
            isExporting
              ? { duration: 0 }
              : { duration: 14, repeat: Infinity, ease: "linear" }
          }
        />

        <div
          className="relative overflow-hidden bg-zinc-950/95"
          style={{ clipPath: FUT_CARD_CLIP }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(135deg, rgba(204,255,0,0.18) 0%, transparent 35%, rgba(217,70,239,0.22) 65%, rgba(204,255,0,0.12) 100%)",
            }}
            whileHover={{ opacity: 0.65 }}
            transition={{ duration: 0.3 }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 1px, transparent 8px)",
            }}
          />

          <div className="relative flex min-h-[380px] flex-col px-4 pb-4 pt-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-lime-400/80">
                  OVR
                </span>
                <span className="font-heading text-5xl font-black leading-none tabular-nums text-lime-300 drop-shadow-[0_0_18px_rgba(204,255,0,0.45)]">
                  {futStats.ovr}
                </span>
              </div>

              {favoriteTeam ? (
                <div className="flex flex-col items-end gap-1">
                  <TeamFlag
                    name={favoriteTeam.name}
                    code={favoriteTeam.code}
                    logoUrl={favoriteTeam.logo_url}
                    teamId={favoriteTeam.id}
                    size={36}
                    className="rounded-md border border-lime-400/40 shadow-[0_0_12px_rgba(204,255,0,0.25)]"
                  />
                  <span className="max-w-[72px] truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {favoriteTeam.code ?? favoriteTeam.name}
                  </span>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-white/15 px-2 py-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                  —
                </div>
              )}
            </div>

            <div className="relative mx-auto my-4 flex flex-1 flex-col items-center justify-center">
              <div
                data-export-blur
                className="absolute size-36 rounded-full bg-lime-400/10 blur-2xl"
              />
              <div
                data-export-blur
                className="absolute size-24 rounded-full bg-fuchsia-500/10 blur-xl"
              />

              <div className="relative size-28 overflow-hidden rounded-full border-2 border-lime-400/60 bg-zinc-900 shadow-[0_0_24px_rgba(204,255,0,0.35),inset_0_0_20px_rgba(255,255,255,0.08)]">
                {showAvatar ? (
                  <img
                    data-export-avatar
                    src={avatarUrl!}
                    alt=""
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                    decoding="async"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 font-heading text-2xl font-bold text-lime-300">
                    {initials}
                  </div>
                )}
              </div>

              <p className="mt-3 max-w-full truncate text-center font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
                {playerName}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-fuchsia-300/80">
                Pronostiqueur
              </p>
            </div>

            <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
              {futStats.stats.map((stat) => (
                <div
                  key={stat.key}
                  className="flex flex-col items-center rounded-md bg-white/[0.03] px-1 py-1.5"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {stat.short}
                    </span>
                    <span data-export-ignore>
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          className="inline-flex shrink-0 rounded-full text-muted-foreground/70 transition-colors hover:text-lime-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime-400"
                          aria-label={`${stat.label} — en savoir plus`}
                        >
                          <Info className="size-2.5" aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-[210px] border border-white/10 bg-zinc-900 text-left text-zinc-100 shadow-lg"
                        >
                          <p className="font-semibold text-lime-300">{stat.label}</p>
                          <p className="mt-1 font-normal leading-snug text-zinc-300">
                            {stat.description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </div>
                  <span className="font-heading text-lg font-bold tabular-nums text-lime-300">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-center text-[9px] font-medium uppercase tracking-[0.22em] text-white/35">
              WC2026 Pool
            </p>
          </div>
        </div>
      </div>
    </motion.article>

      {showShareButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-lime-400/30 bg-lime-400/5 text-lime-200 hover:bg-lime-400/10 hover:text-lime-100"
          disabled={isExporting}
          onClick={handleShare}
        >
          {isExporting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Export en cours…
            </>
          ) : (
            <>
              <Share2 aria-hidden />
              Partager ma carte
            </>
          )}
        </Button>
      )}
    </div>
  );
}
