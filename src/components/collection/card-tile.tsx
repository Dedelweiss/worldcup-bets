import { cn } from "@/lib/utils";
import { flagEmoji, RARITY_LABEL, RARITY_STYLE } from "@/lib/cards/styles";
import { getNationColors, type NationColors } from "@/lib/cards/nations";
import { stickerRotation } from "@/lib/cards/sticker";
import type { AlbumCard } from "@/lib/cards/types";

function Jersey({
  number,
  colors,
}: {
  number: number | null;
  colors: NationColors;
}) {
  return (
    <svg viewBox="0 0 100 100" className="h-14 w-14" aria-hidden>
      <path
        d="M34 14 L12 28 L22 44 L22 86 L78 86 L78 44 L88 28 L66 14 L58 14 L50 24 L42 14 Z"
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {number != null && (
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="30"
          fontWeight="800"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="4"
          style={{ paintOrder: "stroke" }}
        >
          {number}
        </text>
      )}
    </svg>
  );
}

function StatBadge({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded bg-white/10 px-1.5 py-0.5">
      <span className="text-[10px] font-bold leading-none text-white">{value}</span>
      <span className="text-[7px] uppercase leading-tight text-zinc-400">{label}</span>
    </div>
  );
}

export function CardTile({ card }: { card: AlbumCard }) {
  if (!card.owned) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[#bcb4a2] bg-[#f3eee2] p-2 text-center">
        <span className="text-sm font-bold text-[#b3a98f]">n°{card.number}</span>
        <span className="line-clamp-2 text-[10px] text-[#b3a98f]">{card.name}</span>
        <span className="text-[9px] uppercase tracking-wide text-[#c4bba6]">
          à trouver
        </span>
      </div>
    );
  }

  const style = RARITY_STYLE[card.rarity];
  const colors = getNationColors(card.country_code);
  const rot = stickerRotation(card.id);
  const isPlayer = card.category === "joueur";

  return (
    <div
      className="relative rounded-md bg-white p-1 shadow-[0_2px_7px_rgba(0,0,0,0.28)]"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <div
        className={cn(
          "relative flex aspect-[3/4] flex-col overflow-hidden rounded-sm border bg-slate-900",
          style.border,
        )}
      >
        {/* Bandeau couleur du pays */}
        <div className="h-1.5 w-full" style={{ backgroundColor: colors.primary }} />

        {isPlayer ? (
          <div className="flex flex-1 flex-col items-center justify-between p-1.5">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm leading-none" aria-hidden>
                {flagEmoji(card.country_code)}
              </span>
              <span
                className="rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: colors.primary }}
              >
                {card.position ?? "Joueur"}
              </span>
            </div>

            <Jersey number={card.stats?.shirtNumber ?? null} colors={colors} />

            <div className="w-full">
              <p className="truncate text-center text-[11px] font-bold text-white">
                {card.name}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1">
                {card.stats?.age ? (
                  <StatBadge value={card.stats.age} label="ans" />
                ) : null}
                {card.stats?.goals ? (
                  <StatBadge value={card.stats.goals} label="buts" />
                ) : null}
                {card.stats?.shirtNumber ? (
                  <StatBadge value={`#${card.stats.shirtNumber}`} label="num" />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 p-2">
            <span className="text-4xl leading-none" aria-hidden>
              {flagEmoji(card.country_code)}
            </span>
            <span className="line-clamp-2 text-center text-xs font-semibold text-white">
              {card.name}
            </span>
          </div>
        )}

        <div
          className={cn(
            "py-0.5 text-center text-[8px] font-bold uppercase tracking-wider",
            style.text,
          )}
        >
          {RARITY_LABEL[card.rarity]}
        </div>
      </div>

      <span className="absolute left-1.5 top-2.5 rounded-sm bg-white/85 px-1 text-[8px] font-bold text-zinc-700">
        {card.number}
      </span>
      {card.quantity > 1 && (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#b08968] px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
          ×{card.quantity}
        </span>
      )}
    </div>
  );
}
