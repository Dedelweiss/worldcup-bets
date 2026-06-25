import type { CardRarity } from "@/lib/cards/types";

export const RARITY_ORDER: CardRarity[] = [
  "commune",
  "rare",
  "epique",
  "legendaire",
];

export const RARITY_LABEL: Record<CardRarity, string> = {
  commune: "Commune",
  rare: "Rare",
  epique: "Épique",
  legendaire: "Légendaire",
};

/** Puces rareté lisibles sur fond papier (boutique). */
export const SHOP_RARITY_CHIP: Record<CardRarity, string> = {
  commune: "border border-zinc-400/80 bg-zinc-100 text-zinc-900",
  rare: "border border-sky-400/80 bg-sky-50 text-sky-950",
  epique: "border border-fuchsia-400/80 bg-fuchsia-50 text-fuchsia-950",
  legendaire: "border border-amber-500/80 bg-amber-50 text-amber-950",
};

/** Classes Tailwind par rareté (bordure + halo + texte). */
export const RARITY_STYLE: Record<
  CardRarity,
  { border: string; glow: string; text: string; chip: string }
> = {
  commune: {
    border: "border-zinc-500/40",
    glow: "shadow-[0_0_0_rgba(0,0,0,0)]",
    text: "text-zinc-300",
    chip: "bg-zinc-700/60 text-zinc-200",
  },
  rare: {
    border: "border-sky-400/50",
    glow: "shadow-[0_0_18px_-4px_rgba(56,189,248,0.6)]",
    text: "text-sky-300",
    chip: "bg-sky-500/20 text-sky-200",
  },
  epique: {
    border: "border-fuchsia-400/60",
    glow: "shadow-[0_0_22px_-3px_rgba(217,70,239,0.7)]",
    text: "text-fuchsia-300",
    chip: "bg-fuchsia-500/20 text-fuchsia-200",
  },
  legendaire: {
    border: "border-amber-300/70",
    glow: "shadow-[0_0_30px_-2px_rgba(252,211,77,0.85)]",
    text: "text-amber-300",
    chip: "bg-amber-400/25 text-amber-100",
  },
};

/** Convertit un code ISO alpha-2 en drapeau emoji (regional indicators). */
export function flagEmoji(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🏳️";
  const base = 0x1f1e6;
  const cc = countryCode.toUpperCase();
  return String.fromCodePoint(
    base + (cc.charCodeAt(0) - 65),
    base + (cc.charCodeAt(1) - 65),
  );
}
