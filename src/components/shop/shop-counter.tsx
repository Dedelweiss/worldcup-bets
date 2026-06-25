import { cn } from "@/lib/utils";
import { PAPER_PANEL_STYLE } from "@/lib/cards/sticker";

export function ShopCounter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        "bg-gradient-to-b from-[#2a2218] to-[#1a1510]",
        className,
      )}
    >
      <div
        className="rounded-xl border-2 border-[#c4b89a] p-4 text-[#2f2618] sm:p-5"
        style={PAPER_PANEL_STYLE}
      >
        {children}
      </div>
    </div>
  );
}
