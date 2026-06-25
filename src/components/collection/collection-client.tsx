"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Coins, Gift, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardTile } from "@/components/collection/card-tile";
import { HoloCard } from "@/components/collection/holo-card";
import { MuteToggle } from "@/components/collection/mute-toggle";
import { PackOpeningOverlay } from "@/components/collection/pack-opening-overlay";
import { buyPackAction, openPackAction } from "@/app/(app)/collection/actions";
import { primeSound } from "@/lib/cards/sound";
import { PAPER_PANEL_STYLE } from "@/lib/cards/sticker";
import type { CardRarity, CollectionData, OpenPackResult } from "@/lib/cards/types";

function isRarePlus(rarity: CardRarity): boolean {
  return rarity === "rare" || rarity === "epique" || rarity === "legendaire";
}

export function CollectionClient({ data }: { data: CollectionData }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [opening, setOpening] = useState<OpenPackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(0);

  const packCount = data.inventory.length;
  const completion =
    data.totalCount > 0
      ? Math.round((data.ownedCount / data.totalCount) * 100)
      : 0;

  const groups = data.groups;
  const pageIndex = groups.length ? Math.min(page, groups.length - 1) : 0;
  const currentGroup = groups[pageIndex] ?? null;

  function goToPage(to: number) {
    const target = Math.max(0, Math.min(groups.length - 1, to));
    setDir(target > pageIndex ? 1 : target < pageIndex ? -1 : 0);
    setPage(target);
  }

  const duplicates = data.groups.reduce(
    (sum, g) =>
      sum +
      g.cards.reduce((s, c) => s + (c.owned ? Math.max(0, c.quantity - 1) : 0), 0),
    0,
  );

  function handleBuy(packTypeId: string) {
    setError(null);
    startTransition(async () => {
      const res = await buyPackAction(packTypeId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleOpen() {
    setError(null);
    primeSound();
    startTransition(async () => {
      const res = await openPackAction();
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOpening(res.result);
    });
  }

  function closeOverlay() {
    setOpening(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Soldes + son */}
      <div className="flex items-stretch gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Stat icon={<Coins className="size-4" />} label="Jetons" value={data.coins} />
          <Stat
            icon={<Sparkles className="size-4" />}
            label="Éclats"
            value={data.shards}
          />
          <Stat
            icon={<Package className="size-4" />}
            label="Album"
            value={`${data.ownedCount}/${data.totalCount}`}
          />
        </div>
        <MuteToggle />
      </div>

      {/* Progression holographique */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progression de l&apos;album</span>
          <span className="tabular-nums">{completion}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-[#d8d0bf] bg-[#e4dccb]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${completion}%`, backgroundColor: "#8a6d3b" }}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Inventaire de packs */}
      {packCount > 0 && (
        <div className="rounded-xl border border-lime-400/30 bg-lime-400/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-lime-400" aria-hidden />
              <span className="text-sm font-semibold">
                {packCount} pack{packCount > 1 ? "s" : ""} à ouvrir
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpen}
              disabled={isPending}
              className="rounded-xl bg-lime-400 px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-lime-300 disabled:opacity-50"
            >
              {isPending ? "..." : "Ouvrir un pack"}
            </button>
          </div>
        </div>
      )}

      {/* Boutique de packs */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Boutique</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.packTypes.map((pack) => {
            const affordable = data.coins >= pack.price_points;
            return (
              <div
                key={pack.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4"
              >
                <div>
                  <p className="font-semibold">{pack.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pack.card_count} cartes · {pack.price_points} jetons
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(pack.id)}
                  disabled={isPending || !affordable}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {affordable ? "Acheter" : "Trop cher"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saut rapide vers une page-nation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {groups.map((group, i) => (
          <FilterChip
            key={group.key}
            active={i === pageIndex}
            onClick={() => goToPage(i)}
          >
            {group.label}
          </FilterChip>
        ))}
      </div>

      {/* Livre : une page par pays, avec tournage de page */}
      {currentGroup && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              aria-label="Page précédente"
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {pageIndex + 1} / {groups.length}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex === groups.length - 1}
              aria-label="Page suivante"
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          {/* Reliure/couverture fixe : seule la page intérieure tourne */}
          <div className="rounded-2xl border-2 border-[#c9bfa6] bg-[#d8cdb3] p-2 shadow-[0_12px_34px_-14px_rgba(0,0,0,0.65)]">
            <div className="relative" style={{ perspective: 1700 }}>
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={currentGroup.key}
                  custom={dir}
                  variants={{
                    enter: (d: number) =>
                      reduce
                        ? { opacity: 0 }
                        : { opacity: 0, rotateY: d >= 0 ? 90 : -90 },
                    center: { opacity: 1, rotateY: 0 },
                    exit: (d: number) =>
                      reduce
                        ? { opacity: 0 }
                        : { opacity: 0, rotateY: d >= 0 ? -90 : 90 },
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduce ? 0.12 : 0.5, ease: "easeInOut" }}
                  style={{
                    transformOrigin: dir >= 0 ? "left center" : "right center",
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "hidden",
                  }}
                  className="rounded-lg"
                >
                  <div
                    style={PAPER_PANEL_STYLE}
                    className="relative rounded-lg p-4"
                  >
                    {duplicates > 0 && pageIndex === 0 && (
                      <DoublesPile count={duplicates} />
                    )}
                    <div className="flex items-baseline justify-between px-1">
                      <h3 className="text-base font-bold text-[#3f382b]">
                        {currentGroup.label}
                      </h3>
                      <span className="text-xs tabular-nums text-[#8a7f68]">
                        {currentGroup.ownedCount}/{currentGroup.totalCount}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {currentGroup.cards.map((card) => (
                        <HoloCard
                          key={card.id}
                          active={card.owned && isRarePlus(card.rarity)}
                        >
                          <CardTile card={card} />
                        </HoloCard>
                      ))}
                    </div>
                    {/* Ombre de pliure côté reliure */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-8 rounded-lg"
                      style={{
                        left: dir >= 0 ? 0 : undefined,
                        right: dir >= 0 ? undefined : 0,
                        background:
                          dir >= 0
                            ? "linear-gradient(90deg, rgba(0,0,0,0.16), transparent)"
                            : "linear-gradient(270deg, rgba(0,0,0,0.16), transparent)",
                      }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {opening && (
        <PackOpeningOverlay
          cards={opening.cards}
          shardsGained={opening.shards_gained}
          onClose={closeOverlay}
        />
      )}
    </div>
  );
}

function DoublesPile({ count }: { count: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="relative h-12 w-10 shrink-0">
        <span className="absolute inset-0 rotate-[8deg] rounded-sm border border-[#e6e0d2] bg-white shadow" />
        <span className="absolute inset-0 rotate-[3deg] rounded-sm border border-[#e6e0d2] bg-white shadow" />
        <span className="absolute inset-0 rounded-sm border border-[#e6e0d2] bg-white shadow" />
        <span className="absolute inset-x-[-2px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#b08968]" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-[#3f382b]">
          {count} doublon{count > 1 ? "s" : ""}
        </p>
        <p className="text-xs text-[#8a7f68]">Convertis en éclats à l&apos;ouverture</p>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-lime-400/60 bg-lime-400/15 text-lime-300"
          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-muted/20 p-3 text-center")}>
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
