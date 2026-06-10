"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles, X } from "lucide-react";
import { BadgeIcon } from "@/components/badges/badge-icon";
import { BadgeRarityChip } from "@/components/badges/badge-rarity-chip";
import { setProfileBadgesAction } from "@/app/(app)/profile/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MAX_PROFILE_BADGES,
  type BadgeCatalogEntry,
  type PlayerBadge,
} from "@/lib/badges";
import {
  BADGE_RARITY_ORDER,
  getBadgeGridBorderClasses,
  getBadgeSlotClasses,
  parseBadgeRarity,
} from "@/lib/badge-rarity";
import { cn } from "@/lib/utils";

type FilterMode = "unlocked" | "all" | "locked";

interface ProfileBadgesSectionProps {
  catalog: BadgeCatalogEntry[];
  unlocked: PlayerBadge[];
  selectedIds: string[];
}

export function ProfileBadgesSection({
  catalog,
  unlocked,
  selectedIds: initialSelected,
}: ProfileBadgesSectionProps) {
  const router = useRouter();
  const unlockedIds = useMemo(
    () => new Set(unlocked.map((b) => b.id)),
    [unlocked],
  );
  const unlockedById = useMemo(
    () => new Map(unlocked.map((b) => [b.id, b])),
    [unlocked],
  );
  const catalogById = useMemo(
    () => new Map(catalog.map((b) => [b.id, b])),
    [catalog],
  );

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("unlocked");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  const dirty =
    selected.length !== initialSelected.length ||
    selected.some((id, i) => id !== initialSelected[i]);

  const focusedBadge =
    focusedId != null ? catalogById.get(focusedId) ?? null : null;
  const focusedUnlocked = focusedId != null && unlockedIds.has(focusedId);
  const focusedSelected =
    focusedId != null && selected.includes(focusedId);

  function toggleBadge(badgeId: string) {
    if (!unlockedIds.has(badgeId)) {
      setFocusedId(badgeId);
      return;
    }

    setSelected((prev) => {
      if (prev.includes(badgeId)) {
        setError(null);
        return prev.filter((id) => id !== badgeId);
      }
      if (prev.length >= MAX_PROFILE_BADGES) {
        setError(`Maximum ${MAX_PROFILE_BADGES} badges sur la vitrine.`);
        return prev;
      }
      setError(null);
      return [...prev, badgeId];
    });
    setFocusedId(badgeId);
  }

  function removeFromSlot(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await setProfileBadgesAction(selected);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Vitrine mise à jour.");
      router.refresh();
    }
    setLoading(false);
  }

  const filteredCatalog = useMemo(() => {
    const list = catalog.filter((badge) => {
      const isUnlocked = unlockedIds.has(badge.id);
      if (filter === "unlocked") return isUnlocked;
      if (filter === "locked") return !isUnlocked;
      return true;
    });
    return list.sort((a, b) => {
      const rarityA = BADGE_RARITY_ORDER.indexOf(parseBadgeRarity(a.rarity));
      const rarityB = BADGE_RARITY_ORDER.indexOf(parseBadgeRarity(b.rarity));
      if (rarityA !== rarityB) return rarityA - rarityB;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [catalog, filter, unlockedIds]);

  const showcaseSlots = Array.from({ length: MAX_PROFILE_BADGES }, (_, i) => {
    const id = selected[i];
    if (!id) return null;
    const entry = catalogById.get(id);
    const unlock = unlockedById.get(id);
    if (!entry) return null;
    return { ...entry, unlocked_at: unlock?.unlocked_at };
  });

  return (
    <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-md">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Sparkles className="size-4 text-lime-400" aria-hidden />
              Vitrine de badges
            </CardTitle>
            <CardDescription className="mt-1">
              Compose ta vitrine publique ({MAX_PROFILE_BADGES} emplacements max).
              Sans choix, tes 5 derniers succès s&apos;affichent au classement.
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-lime-300">
            {unlocked.length}/{catalog.length}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* Vitrine — emplacements type loadout */}
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 p-3 shadow-inner sm:p-4">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.08),transparent_55%)]"
            aria-hidden
          />
          <p className="relative mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Affichage public
          </p>
          <div className="relative grid grid-cols-5 gap-1.5 pt-0.5 sm:gap-3">
            {showcaseSlots.map((badge, index) => (
              <ShowcaseSlot
                key={`slot-${index}`}
                badge={badge}
                index={index}
                onRemove={() => removeFromSlot(index)}
                disabled={loading}
              />
            ))}
          </div>
          {selected.length === 0 && unlocked.length > 0 && (
            <p className="relative mt-3 text-center text-xs text-muted-foreground">
              Touche un badge débloqué ci-dessous pour l&apos;ajouter ici
            </p>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["unlocked", "Débloqués"],
              ["all", "Tous"],
              ["locked", "À débloquer"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                filter === id
                  ? "border-lime-400/50 bg-lime-400/15 text-lime-300 shadow-sm shadow-lime-400/10"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grille médailles */}
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
          {filteredCatalog.map((badge) => {
            const isUnlocked = unlockedIds.has(badge.id);
            const isSelected = selected.includes(badge.id);
            const isFocused = focusedId === badge.id;
            const slotIndex = selected.indexOf(badge.id);
            const rarity = parseBadgeRarity(badge.rarity);

            return (
              <button
                key={badge.id}
                type="button"
                disabled={loading}
                onClick={() => toggleBadge(badge.id)}
                className={cn(
                  "group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border p-2 transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50",
                  isUnlocked
                    ? cn(
                        "bg-zinc-900/60 hover:-translate-y-0.5 hover:shadow-lg",
                        getBadgeGridBorderClasses(rarity),
                      )
                    : "cursor-default border-white/5 bg-zinc-950/50 opacity-70",
                  isSelected &&
                    "border-lime-400/60 bg-lime-400/10 shadow-md shadow-lime-400/15 ring-1 ring-lime-400/30",
                  isFocused && !isSelected && "ring-1 ring-white/20",
                )}
                aria-pressed={isSelected}
                aria-label={badge.name}
              >
                {!isUnlocked && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-zinc-950/50 backdrop-blur-[1px]">
                    <Lock className="size-4 text-zinc-500" aria-hidden />
                  </span>
                )}
                <BadgeIcon
                  iconName={badge.icon_name}
                  rarity={badge.rarity}
                  size="md"
                  className={cn(!isUnlocked && "opacity-50 grayscale")}
                />
                <span className="mt-1 line-clamp-2 w-full text-center text-[9px] font-medium leading-tight text-zinc-400 group-hover:text-zinc-200">
                  {badge.name.replace(/^Le |^La |^L'/, "")}
                </span>
                {isSelected && slotIndex >= 0 && (
                  <span className="absolute right-0 top-0 flex size-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-lime-400 text-[9px] font-bold text-black shadow-md sm:size-5 sm:text-[10px]">
                    {slotIndex + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filteredCatalog.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun badge dans cette catégorie.
          </p>
        )}

        {/* Fiche détail */}
        <AnimatePresence mode="wait">
          {focusedBadge && (
            <motion.div
              key={focusedBadge.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "rounded-xl border p-4",
                focusedUnlocked
                  ? "border-lime-400/25 bg-lime-400/5"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="flex items-start gap-3">
                <BadgeIcon
                  iconName={focusedBadge.icon_name}
                  rarity={focusedBadge.rarity}
                  size="lg"
                  className={cn(
                    "rounded-2xl",
                    !focusedUnlocked && "opacity-50 grayscale",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading font-semibold">
                      {focusedBadge.name}
                    </p>
                    <BadgeRarityChip rarity={focusedBadge.rarity} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {focusedBadge.description}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {focusedUnlocked
                      ? focusedSelected
                        ? "Épinglé sur ta vitrine"
                        : "Débloqué — touche pour épingler"
                      : "Pas encore débloqué"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedId(null)}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  aria-label="Fermer le détail"
                >
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
          <Button
            type="button"
            size="sm"
            disabled={loading || !dirty}
            onClick={() => void handleSave()}
            className="bg-lime-400 text-black hover:bg-lime-300"
          >
            {loading ? "Enregistrement…" : "Publier la vitrine"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {selected.length}/{MAX_PROFILE_BADGES} épinglé
            {selected.length > 1 ? "s" : ""}
          </span>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-lime-400" role="status">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ShowcaseSlot({
  badge,
  index,
  onRemove,
  disabled,
}: {
  badge: (BadgeCatalogEntry & { unlocked_at?: string }) | null;
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}) {
  if (!badge) {
    return (
      <div
        className="flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 sm:rounded-2xl"
        aria-label={`Emplacement ${index + 1} vide`}
      >
        <span className="text-sm font-light text-zinc-600 sm:text-lg">
          {index + 1}
        </span>
      </div>
    );
  }

  const rarity = parseBadgeRarity(badge.rarity);

  return (
    <motion.div
      layout
      className="group relative w-full min-w-0"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <div className={getBadgeSlotClasses(rarity)}>
        <BadgeIcon
          iconName={badge.icon_name}
          rarity={badge.rarity}
          size="sm"
        />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="absolute right-0 top-0 flex size-4 translate-x-1/4 -translate-y-1/4 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-zinc-300 opacity-100 shadow-md sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        aria-label={`Retirer ${badge.name} de la vitrine`}
      >
        <X className="size-2.5 sm:size-3" />
      </button>
      <span className="sr-only">{badge.name}</span>
    </motion.div>
  );
}
