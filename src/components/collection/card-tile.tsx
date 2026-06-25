import { cn } from "@/lib/utils";
import { stickerRotation } from "@/lib/cards/sticker";
import { CardFace } from "@/components/collection/card-face";
import type { AlbumCard } from "@/lib/cards/types";

export function CardTile({
  card,
  compact = false,
}: {
  card: AlbumCard;
  compact?: boolean;
}) {
  if (!card.owned) {
    return (
      <div
        className={cn(
          "flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#bcb4a2] bg-[#f3eee2] text-center",
          compact ? "p-1" : "p-2",
        )}
      >
        <span
          className={cn(
            "font-bold text-[#b3a98f]",
            compact ? "text-[10px]" : "text-sm",
          )}
        >
          n°{card.number}
        </span>
        <span
          className={cn(
            "line-clamp-2 text-[#b3a98f]",
            compact ? "text-[8px] leading-tight" : "text-[10px]",
          )}
        >
          {card.name}
        </span>
        <span
          className={cn(
            "uppercase tracking-wide text-[#c4bba6]",
            compact ? "text-[7px]" : "text-[9px]",
          )}
        >
          à trouver
        </span>
      </div>
    );
  }

  const rot = compact ? 0 : stickerRotation(card.id);

  return (
    <div
      className={cn(
        "relative rounded-lg bg-white/90 shadow-[0_3px_12px_rgba(0,0,0,0.35)]",
        compact ? "p-0.5" : "p-1",
      )}
      style={{ transform: rot ? `rotate(${rot}deg)` : undefined }}
    >
      <CardFace
        name={card.name}
        rarity={card.rarity}
        category={card.category}
        countryCode={card.country_code}
        position={card.position}
        stats={card.stats}
        imagePath={card.image_path}
        compact={compact}
        showNumber={card.number}
      />
      {card.quantity > 1 && (
        <span
          className={cn(
            "absolute rounded-full bg-[#b08968] font-bold text-white shadow",
            compact
              ? "-right-1 -top-1 px-1 text-[7px]"
              : "-right-1.5 -top-1.5 px-1.5 text-[9px]",
          )}
        >
          ×{card.quantity}
        </span>
      )}
    </div>
  );
}
