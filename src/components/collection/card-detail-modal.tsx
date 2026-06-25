"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { CardShowcaseFromAlbum } from "@/components/collection/card-showcase";
import { Button } from "@/components/ui/button";
import {
  CardShareCancelledError,
  shareAlbumCard,
} from "@/lib/cards/card-share";
import { RARITY_LABEL, RARITY_STYLE } from "@/lib/cards/styles";
import type { AlbumCard } from "@/lib/cards/types";
import { cn } from "@/lib/utils";

export function CardDetailModal({
  card,
  onClose,
}: {
  card: AlbumCard | null;
  onClose: () => void;
}) {
  const sharingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const open = card != null;
  const style = card ? RARITY_STYLE[card.rarity] : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function handleShare() {
    if (!card || sharing || sharingRef.current) return;

    sharingRef.current = true;
    setSharing(true);
    try {
      const result = await shareAlbumCard(card);
      if (result === "shared") {
        toast.success("Carte prête — partagez en story ou WhatsApp !");
      } else {
        toast.success("Image téléchargée.");
      }
    } catch (err) {
      if (err instanceof CardShareCancelledError) return;
      toast.error("Impossible de partager cette carte.");
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && card && style && (
        <motion.div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-5 overflow-y-auto p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            aria-label="Fermer"
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 flex w-full max-w-[min(92vw,360px)] flex-col items-center gap-4"
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute -right-1 -top-10 text-white/80 hover:bg-white/10 hover:text-white sm:-right-2"
              onClick={onClose}
              aria-label="Fermer la carte"
            >
              <X aria-hidden />
            </Button>

            <CardShowcaseFromAlbum card={card} />

            <div className="w-full space-y-1 text-center">
              <p
                id="card-detail-title"
                className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl"
              >
                {card.name}
              </p>
              <p
                className={cn(
                  "text-xs font-bold uppercase tracking-[0.2em]",
                  style.text,
                )}
              >
                {RARITY_LABEL[card.rarity]}
                {card.quantity > 1 && (
                  <span className="ml-2 text-white/50">×{card.quantity}</span>
                )}
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={sharing}
              onClick={() => void handleShare()}
              className="w-full max-w-xs gap-2 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15"
            >
              {sharing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Share2 className="size-4" aria-hidden />
              )}
              Partager ma carte
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
