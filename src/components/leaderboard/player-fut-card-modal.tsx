"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  FUT_CARD_CLIP,
  PronostiqueurCard,
} from "@/components/profile/pronostiqueur-card";
import { Button } from "@/components/ui/button";
import type { PlayerFutCardPayload } from "@/lib/profile/get-player-fut-card";
import { cn } from "@/lib/utils";

interface PlayerFutCardModalProps {
  open: boolean;
  userId: string | null;
  playerLabel: string;
  onClose: () => void;
}

type RevealPhase = "idle" | "spinning" | "revealed" | "error";

const MIN_SPIN_MS = 900;

function FutCardBack({ label }: { label: string }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[280px] overflow-hidden bg-zinc-950 p-[2px]"
      style={{ clipPath: FUT_CARD_CLIP }}
    >
      <div
        className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-6"
        style={{ clipPath: FUT_CARD_CLIP }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(204,255,0,0.35), rgba(217,70,239,0.25), rgba(204,255,0,0.35))",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 1px, transparent 10px)",
          }}
        />
        <p className="relative font-heading text-[10px] font-bold uppercase tracking-[0.28em] text-lime-400/70">
          WC2026 Pool
        </p>
        <div className="relative my-8 size-24 rounded-full border-2 border-dashed border-lime-400/40 bg-lime-400/5 shadow-[0_0_32px_rgba(204,255,0,0.2)]" />
        <p className="relative max-w-full truncate text-center font-heading text-sm font-semibold uppercase tracking-wide text-foreground/90">
          {label}
        </p>
        <p className="relative mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Carte pronostiqueur
        </p>
      </div>
    </div>
  );
}

export function PlayerFutCardModal({
  open,
  userId,
  playerLabel,
  onClose,
}: PlayerFutCardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<RevealPhase>("idle");
  const [cardData, setCardData] = useState<PlayerFutCardPayload | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !userId) {
      setPhase("idle");
      setCardData(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setPhase("spinning");
    setCardData(null);

    async function load() {
      const minDelay = new Promise((resolve) =>
        setTimeout(resolve, MIN_SPIN_MS),
      );

      try {
        const [response] = await Promise.all([
          fetch(`/api/players/${encodeURIComponent(userId!)}/fut-card`, {
            signal: controller.signal,
          }),
          minDelay,
        ]);

        if (cancelled) return;

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setPhase("error");
          toast.error(body?.error ?? "Impossible de charger la carte.");
          return;
        }

        const data = (await response.json()) as PlayerFutCardPayload;
        if (cancelled) return;

        setCardData(data);
        setPhase("revealed");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setPhase("error");
        toast.error("Impossible de charger la carte.");
        if (process.env.NODE_ENV === "development") {
          console.error("[PlayerFutCardModal]", error);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fut-card-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 w-full max-w-[320px]"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute -right-1 -top-10 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Fermer la carte"
            >
              <X aria-hidden />
            </Button>

            <p id="fut-card-modal-title" className="sr-only">
              Carte pronostiqueur — {playerLabel}
            </p>

            <div
              className="mx-auto flex justify-center"
              style={{ perspective: 1200 }}
            >
              <motion.div
                className="relative w-full max-w-[280px]"
                style={{ transformStyle: "preserve-3d" }}
                animate={
                  phase === "spinning"
                    ? { rotateY: [0, 360] }
                    : phase === "revealed"
                      ? { rotateY: 0 }
                      : { rotateY: 0 }
                }
                transition={
                  phase === "spinning"
                    ? { duration: 0.85, repeat: Infinity, ease: "linear" }
                    : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
                }
              >
                <AnimatePresence mode="wait">
                  {phase === "revealed" && cardData ? (
                    <motion.div
                      key="front"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <PronostiqueurCard
                        playerName={cardData.playerName}
                        avatarUrl={cardData.avatarUrl}
                        favoriteTeam={cardData.favoriteTeam}
                        futStats={cardData.futStats}
                        embedded
                        showShareButton={false}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, rotateY: 90 }}
                      transition={{ duration: 0.35 }}
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <FutCardBack label={playerLabel} />
                      {phase === "spinning" && (
                        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/60">
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          Révélation…
                        </p>
                      )}
                      {phase === "error" && (
                        <p className="mt-3 text-center text-xs text-red-300/90">
                          Carte indisponible.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {phase === "revealed" && cardData && (
              <motion.p
                className={cn(
                  "mt-4 text-center text-xs text-white/55",
                )}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                OVR {cardData.futStats.ovr} · stats calculées depuis les paris classiques
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
