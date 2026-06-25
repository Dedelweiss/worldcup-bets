"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buyPackAction } from "@/app/(app)/shop/actions";
import { PackBox } from "@/components/shop/pack-box";
import { ShopBuyButton } from "@/components/shop/shop-buy-button";
import { CurrencyAmount } from "@/components/shop/currency-display";
import {
  guaranteedRarityLabel,
  packDropRates,
} from "@/lib/cards/pack-rates";
import { playSound, primeSound } from "@/lib/cards/sound";
import { RARITY_LABEL, SHOP_RARITY_CHIP } from "@/lib/cards/styles";
import type { PackTypeShop, ShopPackDailyQuota } from "@/lib/cards/shop-types";
import { cn } from "@/lib/utils";

export function ShopPackGrid({
  packTypes,
  coins,
  shards,
  packDailyQuota,
}: {
  packTypes: PackTypeShop[];
  coins: number;
  shards: number;
  packDailyQuota: ShopPackDailyQuota;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const runningRef = useRef<string | null>(null);

  const quotaReached =
    !packDailyQuota.unlimited && (packDailyQuota.remaining ?? 0) <= 0;

  function handleBuy(pack: PackTypeShop) {
    if (pending || runningRef.current || quotaReached) return;
    const affordable =
      pack.price_currency === "pack_coins"
        ? coins >= pack.price_points
        : shards >= pack.price_points;
    if (!affordable) return;

    const idempotencyKey = crypto.randomUUID();
    runningRef.current = pack.id;
    setError(null);
    primeSound();

    startTransition(async () => {
      const res = await buyPackAction(pack.id, idempotencyKey);
      runningRef.current = null;
      if (!res.success) {
        setError(res.error);
        return;
      }
      playSound("cash");
      setSuccessId(pack.id);
      window.setTimeout(() => setSuccessId(null), 500);
      router.refresh();
    });
  }

  if (packTypes.length === 0) {
    return (
      <p className="text-sm font-medium text-[#4a3820]">
        Aucun pack disponible pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!packDailyQuota.unlimited && (
        <p className="rounded-lg border border-[#b8aa8e] bg-[#f5efe3] px-3 py-2 text-xs font-medium text-[#4a3820]">
          Achat limité à {packDailyQuota.limit} pack
          {packDailyQuota.limit > 1 ? "s" : ""} par jour en boutique —{" "}
          {packDailyQuota.used}/{packDailyQuota.limit} achat
          {packDailyQuota.limit > 1 ? "s" : ""} utilisé
          {packDailyQuota.limit > 1 ? "s" : ""} aujourd&apos;hui.
          {quotaReached && " Revenez demain pour un nouvel achat."}
          {" "}
          Les packs gagnés aux paris ne comptent pas dans cette limite.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {packTypes.map((pack) => {
          const affordable =
            pack.price_currency === "pack_coins"
              ? coins >= pack.price_points
              : shards >= pack.price_points;
          const rates = packDropRates(pack.weights);

          return (
            <article
              key={pack.id}
              className="flex flex-col gap-4 rounded-xl border border-[#b8aa8e] bg-[#faf6ee] p-4 sm:flex-row sm:items-start"
            >
              <PackBox code={pack.code} name={pack.name} />

              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#2f2618]">
                    {pack.name}
                  </h3>
                  {pack.description && (
                    <p className="mt-0.5 text-xs text-[#5c4a32]">
                      {pack.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium text-[#4a3820]">
                    {pack.card_count} cartes ·{" "}
                    {guaranteedRarityLabel(pack.guaranteed_min_rarity)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#5c4a32]">
                    Probabilités / slot
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {rates.map(({ rarity, pct }) => (
                      <li
                        key={rarity}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold",
                          SHOP_RARITY_CHIP[rarity],
                        )}
                      >
                        {RARITY_LABEL[rarity]} {pct}%
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CurrencyAmount
                    amount={pack.price_points}
                    currency={pack.price_currency}
                  />
                  <ShopBuyButton
                    label={
                      quotaReached
                        ? "Limite du jour atteinte"
                        : affordable
                          ? "Acheter"
                          : "Solde insuffisant"
                    }
                    disabled={!affordable || quotaReached}
                    loading={pending && runningRef.current === pack.id}
                    success={successId === pack.id}
                    onClick={() => handleBuy(pack)}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-xs font-medium text-[#4a3820]">
        Les packs achetés apparaissent dans{" "}
        <Link
          href="/collection"
          className="font-bold text-[#6b5428] underline decoration-[#8a6d3b]/60 underline-offset-2"
        >
          votre collection
        </Link>{" "}
        — ouvrez-les quand vous voulez.
      </p>
    </div>
  );
}
