"use client";

import { useState } from "react";
import Link from "next/link";
import { MuteToggle } from "@/components/collection/mute-toggle";
import { ShopCounter } from "@/components/shop/shop-counter";
import { ShopBalances } from "@/components/shop/shop-balances";
import { ShopPackGrid } from "@/components/shop/shop-pack-grid";
import { ShopMarketGrid } from "@/components/shop/shop-market-grid";
import type { ShopData } from "@/lib/cards/shop-types";
import { cn } from "@/lib/utils";

type ShopTab = "packs" | "market";

export function ShopClient({ data }: { data: ShopData }) {
  const [tab, setTab] = useState<ShopTab>("packs");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <ShopCounter className="flex-1">
          <ShopBalances
            coins={data.coins}
            shards={data.shards}
            packCount={data.packCount}
            expiresAt={data.dailyShop.expires_at}
          />
        </ShopCounter>
        <MuteToggle />
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {(
          [
            ["packs", "Packs"],
            ["market", "Marché du jour"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ShopCounter>
        {tab === "packs" ? (
          <ShopPackGrid
            packTypes={data.packTypes}
            coins={data.coins}
            shards={data.shards}
            packDailyQuota={data.packDailyQuota}
          />
        ) : (
          <ShopMarketGrid
            listings={data.dailyShop.listings}
            coins={data.coins}
            shards={data.shards}
          />
        )}
      </ShopCounter>

      {data.packCount > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Vous avez{" "}
          <Link href="/collection" className="font-semibold text-primary underline">
            {data.packCount} pack{data.packCount > 1 ? "s" : ""} à ouvrir
          </Link>
          .
        </p>
      )}
    </div>
  );
}
