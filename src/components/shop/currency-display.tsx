import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CurrencyToken({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-black text-[#4a3820]",
        "border-[3px] border-[#6b5428] bg-[radial-gradient(circle_at_35%_35%,#ffd966,#c9a227_45%,#8a6d3b_100%)]",
        "shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.25)]",
        size === "sm" ? "size-5 text-[8px]" : "size-7 text-[9px]",
        className,
      )}
      aria-hidden
    >
      J
    </span>
  );
}

export function CurrencyShard({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 bg-gradient-to-br from-[#a78bfa] via-[#6366f1] to-[#4f46e5]",
        "animate-[shard-sparkle_3s_ease-in-out_infinite]",
        size === "sm" ? "h-4 w-3" : "h-5 w-3.5",
        className,
      )}
      style={{
        clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
      }}
      aria-hidden
    />
  );
}

export function CurrencyAmount({
  amount,
  currency,
  size = "md",
}: {
  amount: number;
  currency: "pack_coins" | "card_shards";
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      {currency === "pack_coins" ? (
        <CurrencyToken size={size} />
      ) : (
        <CurrencyShard size={size} />
      )}
      <span
        className={cn(
          "font-bold text-[#2f2618]",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {formatPoints(amount)}
      </span>
    </span>
  );
}
