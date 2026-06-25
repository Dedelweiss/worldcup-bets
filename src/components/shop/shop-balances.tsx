"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CurrencyAmount } from "@/components/shop/currency-display";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function ShopBalances({
  coins,
  shards,
  packCount,
  expiresAt,
}: {
  coins: number;
  shards: number;
  packCount: number;
  expiresAt: string;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const dayProgress =
    remaining > 0 ? 1 - remaining / (24 * 60 * 60 * 1000) : 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <BalanceTile label="Jetons">
          <CurrencyAmount amount={coins} currency="pack_coins" />
        </BalanceTile>
        <BalanceTile label="Éclats">
          <CurrencyAmount amount={shards} currency="card_shards" />
        </BalanceTile>
        <BalanceTile
          label="Packs en attente"
          className="col-span-2 sm:col-span-1"
        >
          <span className="text-lg font-bold tabular-nums">{packCount}</span>
        </BalanceTile>
      </div>

      <div className="rounded-lg border border-[#b8aa8e] bg-[#f0e8d8] px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-xs text-[#3d3225]">
          <span className="font-semibold">Marché du jour</span>
          <span className="font-bold tabular-nums text-[#2f2618]">
            Renouvellement · {formatCountdown(remaining)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#d8d0bf]">
          <div
            className="h-full rounded-full bg-[#8a6d3b] transition-all duration-1000"
            style={{ width: `${Math.min(100, dayProgress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BalanceTile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#b8aa8e] bg-[#faf6ee] px-3 py-2 text-center",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5c4a32]">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center text-[#2f2618]">
        {children}
      </div>
    </div>
  );
}
