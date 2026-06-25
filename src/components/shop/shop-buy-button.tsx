"use client";

import { cn } from "@/lib/utils";

export function ShopBuyButton({
  label,
  disabled,
  loading,
  success,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "relative rounded-lg px-4 py-2 text-sm font-bold text-white transition-[transform,box-shadow,background] duration-75",
        "bg-gradient-to-b from-[#9a7b4f] to-[#6b5428]",
        "shadow-[0_4px_0_#4a3820,0_6px_12px_rgba(0,0,0,0.2)]",
        "active:translate-y-[3px] active:shadow-[0_1px_0_#4a3820]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_#4a3820]",
        success && "animate-[buy-flash_0.45s_ease]",
      )}
    >
      {loading ? "…" : label}
    </button>
  );
}
