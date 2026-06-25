"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyMarketCardAction } from "@/app/(app)/shop/actions";
import { CardFace } from "@/components/collection/card-face";
import { HoloCard } from "@/components/collection/holo-card";
import { ShopBuyButton } from "@/components/shop/shop-buy-button";
import { CurrencyAmount } from "@/components/shop/currency-display";
import { playSound, primeSound } from "@/lib/cards/sound";
import type { DailyMarketListing } from "@/lib/cards/shop-types";
import { cn } from "@/lib/utils";

export function ShopMarketGrid({
  listings,
  coins,
  shards,
}: {
  listings: DailyMarketListing[];
  coins: number;
  shards: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const runningRef = useRef<string | null>(null);

  function handleBuy(listing: DailyMarketListing) {
    if (pending || runningRef.current || listing.purchased) return;
    if (listing.owned) return;

    const affordable =
      listing.price_currency === "pack_coins"
        ? coins >= listing.price_amount
        : shards >= listing.price_amount;
    if (!affordable) return;

    const idempotencyKey = crypto.randomUUID();
    runningRef.current = listing.listing_id;
    setError(null);
    setMessage(null);
    primeSound();

    startTransition(async () => {
      const res = await buyMarketCardAction(listing.listing_id, idempotencyKey);
      runningRef.current = null;
      if (!res.success) {
        setError(res.error);
        return;
      }
      playSound("cash");
      setSuccessId(listing.listing_id);
      if (res.result.duplicate && res.result.shards_gained > 0) {
        setMessage(
          `Doublon converti en +${res.result.shards_gained} éclats.`,
        );
      } else {
        setMessage(`${res.result.name} ajouté à votre album !`);
      }
      window.setTimeout(() => setSuccessId(null), 500);
      router.refresh();
    });
  }

  if (listings.length === 0) {
    return (
      <p className="text-sm font-medium text-[#4a3820]">
        Le marché se renouvelle bientôt — catalogue joueurs requis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg bg-lime-100 px-3 py-2 text-sm font-medium text-lime-950">
          {message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {listings.map((listing) => {
          const affordable =
            listing.price_currency === "pack_coins"
              ? coins >= listing.price_amount
              : shards >= listing.price_amount;
          const soldOut = listing.purchased;
          const owned = listing.owned;
          const disabled = soldOut || owned || !affordable;

          return (
            <article
              key={listing.listing_id}
              className={cn(
                "relative flex flex-col gap-3 rounded-xl border border-[#b8aa8e] bg-[#faf6ee] p-3",
                (soldOut || owned) && "opacity-75",
              )}
            >
              {(soldOut || owned) && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/25"
                  aria-hidden
                >
                  <span
                    className={cn(
                      "rounded border-2 px-3 py-1 text-xs font-black uppercase tracking-widest",
                      soldOut
                        ? "rotate-[-12deg] border-red-600 bg-red-600/90 text-white"
                        : "rotate-[-12deg] border-[#8a6d3b] bg-[#efe9dc] text-[#4a3820]",
                    )}
                  >
                    {soldOut ? "Vendu" : "Possédé"}
                  </span>
                </div>
              )}

              <div className="mx-auto w-[88px]">
                <HoloCard
                  active={
                    listing.rarity === "rare" ||
                    listing.rarity === "epique" ||
                    listing.rarity === "legendaire"
                  }
                >
                  <CardFace
                    name={listing.name}
                    rarity={listing.rarity}
                    category={listing.category}
                    countryCode={listing.country_code}
                    position={listing.position}
                    stats={listing.stats}
                    imagePath={listing.image_path}
                    compact
                  />
                </HoloCard>
              </div>

              <div className="text-center">
                <p className="line-clamp-2 text-sm font-bold text-[#2f2618]">
                  {listing.name}
                </p>
                {listing.position && (
                  <p className="text-[10px] font-medium text-[#5c4a32]">
                    {listing.position}
                  </p>
                )}
              </div>

              <div className="mt-auto flex flex-col items-center gap-2">
                <CurrencyAmount
                  amount={listing.price_amount}
                  currency={listing.price_currency}
                  size="sm"
                />
                <ShopBuyButton
                  label={
                    soldOut
                      ? "Acheté"
                      : owned
                        ? "Déjà dans l'album"
                        : affordable
                          ? "Acheter"
                          : "Solde insuffisant"
                  }
                  disabled={disabled}
                  loading={pending && runningRef.current === listing.listing_id}
                  success={successId === listing.listing_id}
                  onClick={() => handleBuy(listing)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
