"use client";

import { CardShowcase } from "@/components/collection/card-showcase";
import type { CardRarity, CardStats } from "@/lib/cards/types";

export function ShareCardPreview({
  name,
  rarity,
  category,
  countryCode,
  position,
  stats,
  imagePath,
  catalogNumber,
}: {
  name: string;
  rarity: CardRarity;
  category: string | null;
  countryCode: string | null;
  position: string | null;
  stats: CardStats | null;
  imagePath: string | null;
  catalogNumber: number;
}) {
  return (
    <CardShowcase
      name={name}
      rarity={rarity}
      category={category}
      countryCode={countryCode}
      position={position}
      stats={stats}
      imagePath={imagePath}
      catalogNumber={catalogNumber}
    />
  );
}
