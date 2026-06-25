"use client";

import { CardFace } from "@/components/collection/card-face";
import { HoloCard } from "@/components/collection/holo-card";
import { cn } from "@/lib/utils";
import type { AlbumCard, CardRarity, CardStats } from "@/lib/cards/types";

function isRarePlus(rarity: CardRarity): boolean {
  return rarity === "rare" || rarity === "epique" || rarity === "legendaire";
}

/** Carte en grand format (modale, page de partage) avec cadre et largeur stable. */
export function CardShowcase({
  name,
  rarity,
  category,
  countryCode,
  position,
  stats,
  imagePath,
  catalogNumber,
  className,
}: {
  name: string;
  rarity: CardRarity;
  category: string | null;
  countryCode: string | null;
  position: string | null;
  stats: CardStats | null;
  imagePath: string | null;
  catalogNumber?: number | null;
  className?: string;
}) {
  return (
    <HoloCard
      active={isRarePlus(rarity)}
      className="mx-auto w-[min(88vw,320px)] max-w-full"
    >
      <div
        className={cn(
          "rounded-xl bg-white/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
          className,
        )}
      >
        <CardFace
          name={name}
          rarity={rarity}
          category={category}
          countryCode={countryCode}
          position={position}
          stats={stats}
          imagePath={imagePath}
          showNumber={catalogNumber ?? null}
          featured
        />
      </div>
    </HoloCard>
  );
}

export function CardShowcaseFromAlbum({
  card,
  className,
}: {
  card: AlbumCard;
  className?: string;
}) {
  return (
    <CardShowcase
      name={card.name}
      rarity={card.rarity}
      category={card.category}
      countryCode={card.country_code}
      position={card.position}
      stats={card.stats}
      imagePath={card.image_path}
      catalogNumber={card.number}
      className={className}
    />
  );
}
