"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { BookMarked, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { playSound } from "@/lib/cards/sound";
import { flagEmoji, RARITY_LABEL, RARITY_STYLE } from "@/lib/cards/styles";
import type { CardRarity, OpenedCard } from "@/lib/cards/types";

const STEP = 0.3;
const STICK_THRESHOLD = 56;

function isRarePlus(rarity: CardRarity): boolean {
  return rarity === "rare" || rarity === "epique" || rarity === "legendaire";
}

export function PackOpeningOverlay({
  cards,
  shardsGained,
  onClose,
}: {
  cards: OpenedCard[];
  shardsGained: number;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [sealed, setSealed] = useState(true);
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState<Set<number>>(new Set());

  function tear() {
    if (!sealed) return;
    playSound("burst");
    triggerHaptic("celebration");
    setSealed(false);
  }

  function stick(index: number, rarity: CardRarity) {
    setStuck((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    playSound("stick");
    triggerHaptic("selection");
    if (isRarePlus(rarity)) playSound("shine");
  }

  function stickAll() {
    cards.forEach((c, i) => stick(i, c.rarity));
  }

  const allStuck = stuck.size === cards.length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#1a140e]/90 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Ouverture de pack"
      >
        {/* Phase 1 : pack scellé, on déchire */}
        <AnimatePresence onExitComplete={() => setOpen(true)}>
          {sealed && (
            <motion.div
              key="pack"
              className="flex flex-col items-center gap-5"
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative flex h-64 w-44 flex-col items-center justify-center rounded-2xl border border-white/20"
                style={{ backgroundColor: "#8b929b" }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : {
                        rotate: [0, -5, 5, -3, 3, 0],
                        y: -24,
                        scale: 1.12,
                        opacity: 0,
                      }
                }
                transition={{ duration: reduce ? 0.15 : 0.5 }}
              >
                {/* Bande de déchirure qui s'arrache */}
                <motion.div
                  className="absolute inset-x-0 top-0 h-10 rounded-t-2xl border-b-2 border-dashed border-white/50"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  exit={reduce ? { opacity: 0 } : { y: -70, opacity: 0, rotate: -8 }}
                  transition={{ duration: 0.4 }}
                />
                <span className="px-3 text-center text-sm font-bold uppercase tracking-wider text-white/90">
                  Pack
                </span>
                <span className="mt-1 text-xs text-white/70">
                  {cards.length} cartes
                </span>
              </motion.div>

              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragSnapToOrigin
                dragElastic={0.5}
                onTap={tear}
                onDragEnd={(_e: unknown, info: PanInfo) => {
                  if (info.offset.y < -40) tear();
                }}
                style={{ touchAction: "none" }}
                className="cursor-grab rounded-full bg-lime-500 px-5 py-2.5 text-sm font-bold text-black active:cursor-grabbing"
              >
                Glisse vers le haut ou tape pour déchirer
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2 : cartes révélées + collage */}
        {open && (
          <>
            <div className="text-center">
              <h2 className="font-heading text-xl font-bold text-[#f5efe2]">
                Pack ouvert !
              </h2>
              {!allStuck && (
                <p className="mt-1 text-xs text-[#cabfa9]">
                  Tape un autocollant ou glisse-le vers l&apos;album pour le coller
                </p>
              )}
            </div>

            <div className="flex min-h-[150px] flex-wrap items-center justify-center gap-3">
              {cards.map((card, i) => {
                if (stuck.has(i)) return null;
                const style = RARITY_STYLE[card.rarity];
                const delay = reduce ? 0 : i * STEP;
                return (
                  <motion.div
                    key={`${card.card_id}-${i}`}
                    drag
                    dragSnapToOrigin
                    dragElastic={0.9}
                    whileDrag={{ scale: 1.08, zIndex: 50 }}
                    onTap={() => stick(i, card.rarity)}
                    onDragEnd={(_e: unknown, info: PanInfo) => {
                      const dist = Math.hypot(info.offset.x, info.offset.y);
                      if (dist > STICK_THRESHOLD) stick(i, card.rarity);
                    }}
                    style={{ touchAction: "none" }}
                    className="cursor-grab rounded-md bg-white p-1 shadow-[0_3px_10px_rgba(0,0,0,0.45)] active:cursor-grabbing"
                    initial={{ rotateY: 180, opacity: 0, scale: 0.5, y: -40 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay,
                      type: "spring",
                      stiffness: 320,
                      damping: 16,
                    }}
                    onAnimationComplete={() => {
                      if (isRarePlus(card.rarity)) playSound("shine");
                    }}
                  >
                    <div
                      className={cn(
                        "flex aspect-[3/4] w-24 flex-col items-center justify-center gap-1 rounded-sm border bg-zinc-900 p-2 text-center sm:w-28",
                        style.border,
                      )}
                    >
                      <span className="text-3xl leading-none" aria-hidden>
                        {flagEmoji(card.country_code ?? null)}
                      </span>
                      <span className="line-clamp-2 text-[11px] font-semibold text-white">
                        {card.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                          style.chip,
                        )}
                      >
                        {RARITY_LABEL[card.rarity]}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                          card.duplicate
                            ? "bg-zinc-700 text-zinc-200"
                            : "bg-lime-500 text-black",
                        )}
                      >
                        {card.duplicate ? "Doublon" : "Nouveau"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#7d6a4f] bg-[#2a2118] px-5 py-3 text-[#cabfa9]">
              <BookMarked className="size-5" aria-hidden />
              <span className="text-sm font-medium">
                {allStuck
                  ? "Tout est collé !"
                  : `Album · ${stuck.size}/${cards.length} collées`}
              </span>
            </div>

            <div className="flex flex-col items-center gap-3">
              {shardsGained > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-amber-300">
                  <Sparkles className="size-4" aria-hidden />
                  +{shardsGained} éclats (doublons)
                </p>
              )}
              <div className="flex gap-2">
                {!allStuck && (
                  <button
                    type="button"
                    onClick={stickAll}
                    className="rounded-xl border border-[#7d6a4f] px-5 py-2.5 text-sm font-medium text-[#f5efe2] transition-colors hover:bg-white/5"
                  >
                    Tout coller
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-lime-500 px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-lime-400"
                >
                  Terminer
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
