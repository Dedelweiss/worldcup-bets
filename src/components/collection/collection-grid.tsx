"use client";

import { useMemo, useState } from "react";
import { CardDetailModal } from "@/components/collection/card-detail-modal";
import { CardTile } from "@/components/collection/card-tile";
import { HoloCard } from "@/components/collection/holo-card";
import {
  CARD_CATEGORIES,
  CATEGORY_LABEL,
  normalizeCategory,
  type CardCategory,
} from "@/lib/cards/card-categories";
import { RARITY_LABEL, RARITY_ORDER } from "@/lib/cards/styles";
import { cn } from "@/lib/utils";
import type { AlbumCard, AlbumGroup, CardRarity } from "@/lib/cards/types";

type RarityFilter = CardRarity | "all";
type CategoryFilter = CardCategory | "all";
type CountryFilter = string;

function isRarePlus(rarity: CardRarity): boolean {
  return rarity === "rare" || rarity === "epique" || rarity === "legendaire";
}

export function CollectionGrid({
  groups,
  viewMode,
  totalCount,
  ownedCount,
  loading = false,
}: {
  groups: AlbumGroup[];
  viewMode: "owned" | "full";
  totalCount: number;
  ownedCount: number;
  loading?: boolean;
}) {
  const allCards = useMemo(
    () => groups.flatMap((g) => g.cards),
    [groups],
  );

  const countries = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      if (g.key === "_special") {
        map.set("_special", "Spéciales");
        continue;
      }
      map.set(g.key, g.label);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [groups]);

  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [country, setCountry] = useState<CountryFilter>("all");
  const [selectedCard, setSelectedCard] = useState<AlbumCard | null>(null);

  const filtered = useMemo(() => {
    let list = allCards;

    if (rarity !== "all") {
      list = list.filter((c) => c.rarity === rarity);
    }

    if (category !== "all") {
      list = list.filter(
        (c) => normalizeCategory(c.category) === category,
      );
    }

    if (country !== "all") {
      list = list.filter((c) => (c.country_code ?? "_special") === country);
    }

    return [...list].sort((a, b) => {
      const rDiff =
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
      if (rDiff !== 0) return rDiff;

      const countryA = a.country_code ?? "zzz";
      const countryB = b.country_code ?? "zzz";
      const cDiff = countryA.localeCompare(countryB);
      if (cDiff !== 0) return cDiff;

      return a.name.localeCompare(b.name);
    });
  }, [allCards, rarity, category, country]);

  const ownedShown = filtered.filter((c) => c.owned).length;
  const missingShown = filtered.length - ownedShown;

  return (
    <div className="space-y-4">
      {viewMode === "full" && (
        <p className="text-xs text-muted-foreground">
          Vue album : les emplacements manquants sont affichés en grisé. Cette
          vue peut être plus lente sur mobile.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Rareté"
          value={rarity}
          onChange={(v) => setRarity(v as RarityFilter)}
          options={[
            { value: "all", label: "Toutes" },
            ...RARITY_ORDER.map((r) => ({
              value: r,
              label: RARITY_LABEL[r],
            })),
          ]}
        />
        <FilterSelect
          label="Type"
          value={category}
          onChange={(v) => setCategory(v as CategoryFilter)}
          options={[
            { value: "all", label: "Tous" },
            ...CARD_CATEGORIES.map((c) => ({
              value: c,
              label: CATEGORY_LABEL[c],
            })),
          ]}
        />
        <FilterSelect
          label="Pays"
          value={country}
          onChange={setCountry}
          options={[
            { value: "all", label: "Tous" },
            ...countries.map(([code, label]) => ({ value: code, label })),
          ]}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {viewMode === "owned" ? (
          <>
            {filtered.length} carte{filtered.length > 1 ? "s" : ""} possédée
            {filtered.length > 1 ? "s" : ""}
            {totalCount > 0 && (
              <>
                {" "}
                · {ownedCount}/{totalCount} au catalogue (
                {Math.round((ownedCount / totalCount) * 100)}%)
              </>
            )}
          </>
        ) : (
          <>
            {filtered.length} emplacement{filtered.length > 1 ? "s" : ""} ·{" "}
            {ownedShown} possédée{ownedShown > 1 ? "s" : ""}
            {missingShown > 0 &&
              ` · ${missingShown} manquante${missingShown > 1 ? "s" : ""}`}
          </>
        )}
      </p>

      {loading ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Chargement de l&apos;album complet…
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {viewMode === "owned" ? (
            <>
              Aucune carte possédée pour ces filtres. Ouvrez un pack ou passez en
              vue « Album complet » pour voir les emplacements manquants.
            </>
          ) : (
            "Aucune carte pour ces filtres."
          )}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((card) => (
            <HoloCard
              key={card.id}
              active={card.owned && isRarePlus(card.rarity)}
            >
              {card.owned ? (
                <button
                  type="button"
                  className="w-full rounded-lg text-left transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  onClick={() => setSelectedCard(card)}
                  aria-label={`Voir ${card.name}`}
                >
                  <CardTile card={card} compact />
                </button>
              ) : (
                <CardTile card={card} compact />
              )}
            </HoloCard>
          ))}
        </div>
      )}

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-[7rem] flex-1 flex-col gap-1 sm:max-w-[11rem]">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 rounded-lg border border-border bg-background px-2 text-sm",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
