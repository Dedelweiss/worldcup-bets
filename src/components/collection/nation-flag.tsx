import { flagEmoji } from "@/lib/cards/styles";
import { getNationColors } from "@/lib/cards/nations";
import { cn } from "@/lib/utils";

/**
 * Drapeau du pays : emoji Unicode (regional indicators) + bandes stylisées en fond.
 */
export function NationFlag({
  countryCode,
  className,
}: {
  countryCode: string | null;
  className?: string;
}) {
  const colors = getNationColors(countryCode);
  const emoji = flagEmoji(countryCode);

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-sm border border-white/25 shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 32"
        className="absolute inset-0 h-full w-full"
      >
        <rect width="48" height="10.5" fill={colors.primary} />
        <rect y="10.5" width="48" height="11" fill={colors.secondary} />
        <rect y="21.5" width="48" height="10.5" fill={colors.primary} />
      </svg>
      <span className="relative z-10 text-[1.1em] leading-none drop-shadow-sm">
        {emoji}
      </span>
    </span>
  );
}
