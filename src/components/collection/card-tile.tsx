import { cn } from "@/lib/utils";
import { flagEmoji, RARITY_LABEL, RARITY_STYLE } from "@/lib/cards/styles";
import { stickerRotation } from "@/lib/cards/sticker";
import type { CardRarity, AlbumCard } from "@/lib/cards/types";

const RARITY_ACCENT: Record<CardRarity, string> = {
  commune: "#94a3b8",
  rare: "#38bdf8",
  epique: "#c084fc",
  legendaire: "#fbbf24",
};

function Jersey({ number, accent }: { number: number | null; accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-12" aria-hidden>
      <path
        d="M34 16 L14 28 L24 42 L24 84 L76 84 L76 42 L86 28 L66 16 L58 16 L50 24 L42 16 Z"
        fill="#0f172a"
        stroke={accent}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {number != null && (
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fill="#f8fafc"
        >
          {number}
        </text>
      )}
    </svg>
  );
}

function StatBadge({ label }: { label: string }) {
  return (
    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold text-zinc-200">
      {label}
    </span>
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
  const accent = RARITY_ACCENT[card.rarity];
  const rot = stickerRotation(card.id);
  const isPlayer = card.category === "joueur";

  return (
    <div
      className="relative rounded-md bg-white p-1 shadow-[0_2px_7px_rgba(0,0,0,0.28)]"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <div
        className={cn(
          "relative flex aspect-[3/4] flex-col items-center justify-center gap-1 overflow-hidden rounded-sm border bg-zinc-900 p-2 text-center",
          style.border,
        )}
      >
        {/* Drapeau en filigrane d'arrière-plan */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl opacity-10"
        >
          {flagEmoji(card.country_code)}
        </span>

        {isPlayer ? (
          <>
            <span className="absolute right-1 top-1 text-base leading-none" aria-hidden>
              {flagEmoji(card.country_code)}
            </span>
            <Jersey number={card.stats?.shirtNumber ?? null} accent={accent} />
            <span className="line-clamp-2 text-xs font-semibold text-white">
              {card.name}
            </span>
            <span className="text-[9px] text-zinc-400">
              {card.position ?? "Joueur"}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {card.stats?.age ? <StatBadge label={`${card.stats.age} ans`} /> : null}
              {card.stats?.goals ? (
                <StatBadge label={`${card.stats.goals} buts`} />
              ) : null}
            </div>
          </>
        ) : (
          <>
            <span className="text-4xl leading-none" aria-hidden>
              {flagEmoji(card.country_code)}
            </span>
            <span className="line-clamp-2 text-xs font-semibold text-white">
              {card.name}
            </span>
          </>
        )}

        <span
          className={cn(
            "relative rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            style.chip,
          )}
        >
          {RARITY_LABEL[card.rarity]}
        </span>
      </div>

      <span className="absolute left-1 top-1 rounded-sm bg-white/85 px-1 text-[8px] font-bold text-zinc-600">
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
