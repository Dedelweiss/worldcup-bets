"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coins, Gift, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionGrid } from "@/components/collection/collection-grid";
import { MuteToggle } from "@/components/collection/mute-toggle";
import { PackOpeningOverlay } from "@/components/collection/pack-opening-overlay";
import { openPackAction } from "@/app/(app)/collection/actions";
import { primeSound } from "@/lib/cards/sound";
import type { CollectionData } from "@/lib/cards/types";

export function CollectionClient({ data }: { data: CollectionData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packCount = data.inventory.length;
  const completion =
    data.totalCount > 0
      ? Math.round((data.ownedCount / data.totalCount) * 100)
      : 0;

  const nextPack = data.inventory[0] ?? null;
  const nextPackMeta = nextPack
    ? {
        name: nextPack.pack_name,
        cardCount: 5,
      }
    : { name: "Pack", cardCount: 5 };

  function handleOpen() {
    setError(null);
    primeSound();
    setShowPackOpening(true);
  }

  function closeOverlay() {
    setShowPackOpening(false);
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
            value={`${data.ownedCount} / ${data.totalCount}`}
          />
        </div>
        <MuteToggle />
      </div>

      {/* Progression holographique */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {data.ownedCount} possédée{data.ownedCount > 1 ? "s" : ""} sur{" "}
            {data.totalCount} au catalogue
          </span>
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
              disabled={isPending || showPackOpening}
              className="rounded-xl bg-lime-400 px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-lime-300 disabled:opacity-50"
            >
              {showPackOpening ? "Pack en cours…" : "Ouvrir un pack"}
            </button>
          </div>
        </div>
      )}

      {/* Lien boutique */}
      <div className="flex justify-end">
        <Link
          href="/shop"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Acheter des packs →
        </Link>
      </div>

      {/* Album */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mon album</h2>
        <CollectionGrid groups={data.groups} />
      </div>

      {showPackOpening && (
        <PackOpeningOverlay
          packName={nextPackMeta.name}
          cardCount={nextPackMeta.cardCount}
          onOpenPack={async () => {
            const res = await openPackAction();
            if (!res.success) return { error: res.error };
            return res.result;
          }}
          onClose={closeOverlay}
        />
      )}
    </div>
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
