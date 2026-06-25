"use client";

import { useId } from "react";
import { cardDisplayIcon, normalizeCategory } from "@/lib/cards/card-categories";
import { cardImagePublicUrl } from "@/lib/cards/card-image-urls";
import { flagEmoji, RARITY_LABEL, RARITY_STYLE } from "@/lib/cards/styles";
import { getNationColors, type NationColors } from "@/lib/cards/nations";
import { cn } from "@/lib/utils";
import { NationFlag } from "@/components/collection/nation-flag";
import type { AlbumCard, CardRarity } from "@/lib/cards/types";

const RARITY_SURFACE: Record<CardRarity, string> = {
  commune:
    "bg-[linear-gradient(165deg,#2a3140_0%,#1a1f2b_45%,#151922_100%)]",
  rare: "bg-[linear-gradient(135deg,#1e3a5f_0%,#0f2744_40%,#1a4a7a_100%)]",
  epique:
    "bg-[linear-gradient(135deg,#3b1f5c_0%,#1a1030_40%,#5b21b6_100%)]",
  legendaire:
    "bg-[linear-gradient(135deg,#4a3412_0%,#1c1408_35%,#7c5c16_100%)]",
};

function JerseyVisual({
  number,
  colors,
  compact,
  sheenId,
}: {
  number: number | null;
  colors: NationColors;
  compact?: boolean;
  sheenId: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        compact ? "h-12 w-12" : "h-[4.5rem] w-[4.5rem]",
      )}
    >
      <div
        className="absolute inset-0 rounded-full opacity-30 blur-md"
        style={{ backgroundColor: colors.primary }}
      />
      <svg
        viewBox="0 0 100 100"
        className="relative h-full w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
        aria-hidden
      >
        <defs>
          <linearGradient id={sheenId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M32 12 L10 26 L20 42 L20 88 L80 88 L80 42 L90 26 L68 12 L60 12 L50 22 L40 12 Z"
          fill={colors.primary}
          stroke={colors.secondary}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M32 12 L10 26 L20 42 L20 88 L80 88 L80 42 L90 26 L68 12 L60 12 L50 22 L40 12 Z"
          fill={`url(#${sheenId})`}
        />
        {number != null && (
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontSize="32"
          fontWeight="900"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="3"
          style={{ paintOrder: "stroke" }}
        >
          {number}
        </text>
        )}
      </svg>
    </div>
  );
}

function StatPill({
  value,
  label,
  compact,
}: {
  value: string | number;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-md border border-white/10 bg-black/25 px-1.5 py-0.5 backdrop-blur-sm",
        compact && "px-1 py-px",
      )}
    >
      <span
        className={cn(
          "font-bold leading-none text-white",
          compact ? "text-[8px]" : "text-[10px]",
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "uppercase leading-tight text-white/50",
          compact ? "text-[6px]" : "text-[7px]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export interface CardFaceProps {
  name: string;
  rarity: CardRarity;
  category?: string | null;
  countryCode?: string | null;
  position?: string | null;
  stats?: AlbumCard["stats"];
  imagePath?: string | null;
  compact?: boolean;
  /** Grand format (modale / partage) — image pleine, badges plus lisibles. */
  featured?: boolean;
  showNumber?: number | null;
  className?: string;
}

/** Template visuel unifié pour toutes les cartes (grille, packs, preview). */
export function CardFace({
  name,
  rarity,
  category = "joueur",
  countryCode = null,
  position = null,
  stats = null,
  imagePath = null,
  compact = false,
  featured = false,
  showNumber = null,
  className,
}: CardFaceProps) {
  const style = RARITY_STYLE[rarity];
  const colors = getNationColors(countryCode);
  const cat = normalizeCategory(category);
  const isPlayer = cat === "joueur";
  const displayIcon = cardDisplayIcon(category, stats?.icon);
  const isHolo = rarity === "epique" || rarity === "legendaire";
  const isShiny = rarity === "rare" || isHolo;
  const sheenId = useId().replace(/:/g, "");
  const imageUrl = cardImagePublicUrl(imagePath);

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden border-2",
          featured ? "rounded-xl" : "rounded-lg",
          style.border,
          style.glow,
          isShiny && "card-shine",
          isHolo && "card-holo",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full bg-zinc-950",
            featured ? "object-contain object-center" : "object-cover object-center",
          )}
        />

        {/* Légère vignette pour la profondeur */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15",
            featured && "from-black/35 via-transparent to-black/10",
          )}
          aria-hidden
        />

        {showNumber != null && (
          <span
            className={cn(
              "absolute left-1 top-1 z-10 rounded bg-black/55 font-bold text-white/95 backdrop-blur-sm",
              compact
                ? "px-0.5 text-[7px]"
                : featured
                  ? "px-1.5 text-[10px]"
                  : "px-1 text-[8px]",
            )}
          >
            {showNumber}
          </span>
        )}

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/45 py-0.5 text-center font-bold uppercase tracking-[0.15em] text-white backdrop-blur-[2px]",
            compact ? "text-[6px]" : featured ? "text-[9px]" : "text-[8px]",
          )}
        >
          {RARITY_LABEL[rarity]}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] w-full flex-col overflow-hidden border-2",
        featured ? "rounded-xl" : "rounded-lg",
        style.border,
        RARITY_SURFACE[rarity],
        style.glow,
        isShiny && "card-shine",
        isHolo && "card-holo",
        className,
      )}
    >
      {/* Texture grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Bandeau nation */}
      <div
        className="relative z-10 h-1 w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
        }}
      />

      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col",
          compact ? "p-1.5 gap-1" : "p-2 gap-1.5",
        )}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-1">
          {isPlayer || cat === "nation" ? (
            <NationFlag
              countryCode={countryCode}
              className={compact ? "h-4 w-6" : "h-5 w-8"}
            />
          ) : (
            <span className={compact ? "text-sm" : "text-lg"} aria-hidden>
              {displayIcon}
            </span>
          )}
          <span
            className={cn(
              "max-w-[55%] truncate rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wide text-white",
              compact ? "text-[6px]" : "text-[7px]",
            )}
            style={{ backgroundColor: `${colors.primary}cc` }}
          >
            {position ?? (isPlayer ? "Joueur" : cat)}
          </span>
        </div>

        {/* Visuel central */}
        <div className="flex flex-1 items-center justify-center">
          {isPlayer ? (
            <JerseyVisual
              number={stats?.shirtNumber ?? null}
              colors={colors}
              compact={compact}
              sheenId={sheenId}
            />
          ) : (
            <span
              className={cn(
                "drop-shadow-lg",
                compact ? "text-3xl" : "text-5xl",
              )}
              aria-hidden
            >
              {cat === "nation" ? flagEmoji(countryCode) : displayIcon}
            </span>
          )}
        </div>

        {/* Nom */}
        <div className="text-center">
          <p
            className={cn(
              "line-clamp-2 font-bold leading-tight text-white",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            {name}
          </p>
          {!compact && stats?.subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-[8px] text-white/55">
              {stats.subtitle}
            </p>
          ) : null}
        </div>

        {/* Stats */}
        {isPlayer && (
          <div className="flex items-center justify-center gap-1">
            {stats?.age != null ? (
              <StatPill value={stats.age} label="ans" compact={compact} />
            ) : null}
            {stats?.goals != null && stats.goals > 0 ? (
              <StatPill value={stats.goals} label="buts" compact={compact} />
            ) : null}
            {stats?.shirtNumber != null ? (
              <StatPill
                value={`#${stats.shirtNumber}`}
                label="num"
                compact={compact}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Footer rareté */}
      <div
        className={cn(
          "relative z-10 shrink-0 border-t border-white/10 py-0.5 text-center font-bold uppercase tracking-[0.15em]",
          style.text,
          compact ? "text-[6px]" : "text-[8px]",
        )}
      >
        {RARITY_LABEL[rarity]}
      </div>

      {showNumber != null && (
        <span
          className={cn(
            "absolute left-1 top-2 z-20 rounded bg-black/50 font-bold text-white/90 backdrop-blur-sm",
            compact ? "px-0.5 text-[7px]" : "px-1 text-[8px]",
          )}
        >
          {showNumber}
        </span>
      )}
    </div>
  );
}
