"use client";

import { useCallback, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { BookMarked, ChevronRight, Scissors, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardFace } from "@/components/collection/card-face";
import { HoloCard } from "@/components/collection/holo-card";
import { triggerHaptic } from "@/lib/haptics";
import { playSound } from "@/lib/cards/sound";
import type { CardRarity, OpenPackResult, OpenedCard } from "@/lib/cards/types";

const CARD_STEP = 0.3;
const STICK_THRESHOLD = 56;
const CUT_THRESHOLD = 180;

type Phase = "sealed" | "tearing" | "loading" | "reveal";

function isRarePlus(rarity: CardRarity): boolean {
  return rarity === "rare" || rarity === "epique" || rarity === "legendaire";
}

interface PackOpeningOverlayProps {
  packName?: string;
  cardCount?: number;
  onOpenPack: () => Promise<OpenPackResult | { error: string }>;
  onClose: () => void;
}

export function PackOpeningOverlay({
  packName = "Pack officiel",
  cardCount = 5,
  onOpenPack,
  onClose,
}: PackOpeningOverlayProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("sealed");
  const [dragProgress, setDragProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<OpenedCard[]>([]);
  const [shardsGained, setShardsGained] = useState(0);
  const [stuck, setStuck] = useState<Set<number>>(new Set());

  const startTear = useCallback(async () => {
    if (phase !== "sealed") return;

    setPhase("tearing");
    setError(null);
    playSound("burst");
    triggerHaptic("celebration");

    await new Promise((r) => setTimeout(r, reduce ? 120 : 480));

    setPhase("loading");
    const result = await onOpenPack();

    if ("error" in result) {
      setError(result.error);
      setPhase("sealed");
      setDragProgress(0);
      return;
    }

    setCards(result.cards);
    setShardsGained(result.shards_gained);
    setPhase("reveal");
  }, [onOpenPack, phase, reduce]);

  function onCutDrag(_: unknown, info: PanInfo) {
    const progress = Math.min(1, Math.max(0, info.offset.x) / CUT_THRESHOLD);
    setDragProgress(progress);
    if (progress > 0.85) triggerHaptic("selection");
  }

  function onCutDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x >= CUT_THRESHOLD) {
      void startTear();
      return;
    }
    setDragProgress(0);
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

  const allStuck = cards.length > 0 && stuck.size === cards.length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 overflow-y-auto bg-[#0c0a14]/95 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Ouverture de pack"
      >
        {(phase === "sealed" || phase === "tearing" || phase === "loading") && (
          <SealedPackStage
            packName={packName}
            cardCount={cardCount}
            phase={phase}
            dragProgress={dragProgress}
            error={error}
            reduce={reduce}
            onCutDrag={onCutDrag}
            onCutDragEnd={onCutDragEnd}
            onOpenClick={() => void startTear()}
            onCancel={onClose}
          />
        )}

        {phase === "reveal" && (
          <RevealStage
            cards={cards}
            shardsGained={shardsGained}
            stuck={stuck}
            allStuck={allStuck}
            reduce={reduce}
            onStick={stick}
            onStickAll={stickAll}
            onClose={onClose}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function SealedPackStage({
  packName,
  cardCount,
  phase,
  dragProgress,
  error,
  reduce,
  onCutDrag,
  onCutDragEnd,
  onOpenClick,
  onCancel,
}: {
  packName: string;
  cardCount: number;
  phase: Phase;
  dragProgress: number;
  error: string | null;
  reduce: boolean;
  onCutDrag: (_: unknown, info: PanInfo) => void;
  onCutDragEnd: (_: unknown, info: PanInfo) => void;
  onOpenClick: () => void;
  onCancel: () => void;
}) {
  const tearing = phase === "tearing" || phase === "loading";
  const showHint = phase === "sealed" && !error;

  return (
    <motion.div
      className="flex w-full max-w-sm flex-col items-center gap-6"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <p className="text-center text-sm text-[#cabfa9]">
        {phase === "loading"
          ? "Révélation des cartes…"
          : "Coupe le sachet de gauche à droite"}
      </p>

      <div className="relative w-full max-w-[13rem]" style={{ perspective: 900 }}>
        <motion.div
          className="relative w-full"
          animate={
            tearing && !reduce
              ? { rotateX: 6, scale: 0.97 }
              : { rotateX: 0, scale: 1 }
          }
          transition={{ duration: 0.35 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)]",
              tearing && "animate-pulse",
            )}
            style={{
              background:
                "linear-gradient(165deg, #1e3a5f 0%, #0f172a 45%, #1a1033 100%)",
            }}
          >
            {/* Zone de coupe — glisser gauche → droite */}
            <div className="relative z-20 h-[3.75rem] border-b border-white/15 bg-[#0a0f1a]/60">
              {/* Ligne pointillée de coupe */}
              <div
                className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 6px, transparent 6px 12px)",
                }}
              />
              {/* Trait de coupe rempli */}
              <div
                className="absolute left-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-lime-400 to-amber-300 shadow-[0_0_8px_rgba(163,230,53,0.6)]"
                style={{ width: `calc(${dragProgress * 100}% - 0.75rem)` }}
              />

              {/* Curseur / lame */}
              <motion.div
                drag={phase === "sealed" && !reduce ? "x" : false}
                dragConstraints={{ left: 0, right: CUT_THRESHOLD }}
                dragElastic={0.08}
                dragMomentum={false}
                onDrag={onCutDrag}
                onDragEnd={onCutDragEnd}
                animate={
                  tearing
                    ? reduce
                      ? { opacity: 0 }
                      : { x: CUT_THRESHOLD + 40, opacity: 0 }
                    : { x: dragProgress * CUT_THRESHOLD }
                }
                transition={
                  tearing
                    ? { duration: 0.35 }
                    : { type: "spring", stiffness: 400, damping: 30 }
                }
                style={{ touchAction: "none", left: 0 }}
                className={cn(
                  "absolute top-1/2 z-30 flex size-10 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-lime-400/80 bg-lime-400 shadow-[0_0_16px_rgba(163,230,53,0.5)] active:cursor-grabbing",
                  phase !== "sealed" && "pointer-events-none",
                )}
              >
                <Scissors className="size-4 text-black" aria-hidden />
              </motion.div>

              <div className="pointer-events-none flex h-full items-end justify-center pb-1.5">
                <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/50">
                  <ChevronRight
                    className={cn("size-3", showHint && "animate-pulse")}
                    aria-hidden
                  />
                  Glisser →
                </span>
              </div>
            </div>

            {/* Volet scellé qui se déchire avec la coupe */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3.75rem] overflow-hidden"
              style={{
                clipPath: `inset(0 ${100 - dragProgress * 100}% 0 0)`,
              }}
              animate={
                tearing && !reduce
                  ? { y: -20, rotate: -4, opacity: 0 }
                  : { y: 0, rotate: 0, opacity: 1 }
              }
              transition={{ duration: 0.4 }}
            >
              <div
                className="h-full w-full border-b border-white/20"
                style={{
                  background:
                    "linear-gradient(135deg, #e8eef5 0%, #b8c5d6 40%, #d4dce6 100%)",
                }}
              />
            </motion.div>

            {/* Face du pack */}
            <div className="relative px-4 pb-5 pt-4 text-center">
              <div
                className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border-2 border-amber-400/40 bg-amber-500/10 shadow-[inset_0_0_20px_rgba(251,191,36,0.15)]"
                aria-hidden
              >
                <span className="text-2xl">🏆</span>
              </div>
              <p className="font-heading text-sm font-bold uppercase tracking-wider text-white/95">
                {packName}
              </p>
              <p className="mt-1 text-[11px] text-white/55">
                {cardCount} cartes · CDM 2026
              </p>

              {phase === "loading" && (
                <motion.div
                  className="mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full bg-white/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full w-1/2 rounded-full bg-lime-400"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.9,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              )}

              {showHint && (
                <motion.button
                  type="button"
                  onClick={onOpenClick}
                  whileTap={{ scale: 0.97 }}
                  className="mt-5 w-full rounded-xl bg-lime-400 py-2.5 text-sm font-bold text-black shadow-[0_4px_20px_-4px_rgba(163,230,53,0.55)] transition-colors hover:bg-lime-300"
                >
                  Ouvrir le pack
                </motion.button>
              )}
            </div>

            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-white/10 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-black/25 to-transparent"
              aria-hidden
            />
          </div>

          <AnimatePresence>
            {phase === "tearing" && !reduce && (
              <motion.div
                className="pointer-events-none absolute left-1/2 top-6 size-32 -translate-x-1/2 rounded-full bg-lime-400/30 blur-2xl"
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: 1.8, opacity: [0, 0.7, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {showHint && (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-lime-500 via-lime-400 to-amber-400"
              style={{ width: `${dragProgress * 100}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
          <p className="text-center text-[11px] text-[#8a7f68]">
            Fais glisser les ciseaux de gauche à droite — ou utilise le bouton
          </p>
        </div>
      )}

      {error && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#cabfa9] underline underline-offset-2"
          >
            Fermer
          </button>
        </div>
      )}

      {phase === "sealed" && !error && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#6b6355] hover:text-[#cabfa9]"
        >
          Annuler
        </button>
      )}
    </motion.div>
  );
}

function RevealStage({
  cards,
  shardsGained,
  stuck,
  allStuck,
  reduce,
  onStick,
  onStickAll,
  onClose,
}: {
  cards: OpenedCard[];
  shardsGained: number;
  stuck: Set<number>;
  allStuck: boolean;
  reduce: boolean;
  onStick: (index: number, rarity: CardRarity) => void;
  onStickAll: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="flex w-full max-w-lg flex-col items-center gap-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
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
          const delay = reduce ? 0 : i * CARD_STEP;
          const rarePlus = isRarePlus(card.rarity);
          return (
            <motion.div
              key={`${card.card_id}-${i}`}
              drag
              dragSnapToOrigin
              dragElastic={0.9}
              whileDrag={{ scale: 1.08, zIndex: 50 }}
              onTap={() => onStick(i, card.rarity)}
              onDragEnd={(_e: unknown, info: PanInfo) => {
                const dist = Math.hypot(info.offset.x, info.offset.y);
                if (dist > STICK_THRESHOLD) onStick(i, card.rarity);
              }}
              style={{ touchAction: "none" }}
              className="cursor-grab rounded-lg bg-white/90 p-0.5 shadow-[0_3px_10px_rgba(0,0,0,0.45)] active:cursor-grabbing"
              initial={{ rotateY: 180, opacity: 0, scale: 0.5, y: -40 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay,
                type: "spring",
                stiffness: 320,
                damping: 16,
              }}
              onAnimationComplete={() => {
                if (rarePlus) playSound("shine");
              }}
            >
              <HoloCard active={rarePlus}>
                <div className="relative w-24 sm:w-28">
                  <CardFace
                    name={card.name}
                    rarity={card.rarity}
                    category={card.category}
                    countryCode={card.country_code}
                    position={card.position}
                    stats={card.stats}
                    imagePath={card.image_path}
                    compact
                  />
                  <span
                    className={cn(
                      "absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[7px] font-bold",
                      card.duplicate
                        ? "bg-zinc-700 text-zinc-200"
                        : "bg-lime-500 text-black",
                    )}
                  >
                    {card.duplicate ? "Doublon" : "Nouveau"}
                  </span>
                </div>
              </HoloCard>
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
              onClick={onStickAll}
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
    </motion.div>
  );
}
