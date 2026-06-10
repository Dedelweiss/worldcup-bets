"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Star } from "lucide-react";
import { setProfileBadgesAction } from "@/app/(app)/profile/actions";
import { PlayerBadges } from "@/components/leaderboard/player-badges";
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
  getBadgeIcon,
  type BadgeCatalogEntry,
  type PlayerBadge,
} from "@/lib/badges";
import { cn } from "@/lib/utils";

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

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewBadges = selected
    .map((id) => unlockedById.get(id))
    .filter((b): b is PlayerBadge => Boolean(b));

  const dirty =
    selected.length !== initialSelected.length ||
    selected.some((id, i) => id !== initialSelected[i]);

  function toggleBadge(badgeId: string) {
    if (!unlockedIds.has(badgeId)) return;

    setSelected((prev) => {
      if (prev.includes(badgeId)) {
        return prev.filter((id) => id !== badgeId);
      }
      if (prev.length >= MAX_PROFILE_BADGES) {
        setError(`Maximum ${MAX_PROFILE_BADGES} badges sur le profil.`);
        return prev;
      }
      setError(null);
      return [...prev, badgeId];
    });
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await setProfileBadgesAction(selected);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Badges affichés mis à jour.");
      router.refresh();
    }
    setLoading(false);
  }

  const sortedCatalog = useMemo(() => {
    return [...catalog].sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
      const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
      if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [catalog, unlockedIds]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mes badges</CardTitle>
        <CardDescription>
          Débloque des succès en jouant, puis choisis jusqu&apos;à{" "}
          {MAX_PROFILE_BADGES} badges à afficher sur ton profil et dans le
          classement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Aperçu public
          </p>
          {previewBadges.length > 0 ? (
            <PlayerBadges badges={previewBadges} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {unlocked.length > 0
                ? "Aucun badge sélectionné — tes 5 derniers débloqués s'affichent par défaut."
                : "Aucun badge débloqué pour l'instant. Joue des matchs pour en gagner !"}
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {sortedCatalog.map((badge) => {
            const isUnlocked = unlockedIds.has(badge.id);
            const isSelected = selected.includes(badge.id);
            const Icon = getBadgeIcon(badge.icon_name);

            return (
              <button
                key={badge.id}
                type="button"
                disabled={!isUnlocked || loading}
                onClick={() => toggleBadge(badge.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  isUnlocked
                    ? "cursor-pointer hover:border-lime-400/40 hover:bg-lime-400/5"
                    : "cursor-not-allowed opacity-55",
                  isSelected &&
                    "border-lime-400/50 bg-lime-400/10 ring-1 ring-lime-400/30",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    isUnlocked
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isUnlocked ? (
                    <Icon className="size-4" aria-hidden />
                  ) : (
                    <Lock className="size-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {badge.name}
                    </span>
                    {isSelected && (
                      <Star
                        className="size-3.5 shrink-0 fill-lime-400 text-lime-400"
                        aria-hidden
                      />
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {badge.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={loading || !dirty}
            onClick={() => void handleSave()}
          >
            {loading ? "Enregistrement…" : "Enregistrer l'affichage"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {selected.length}/{MAX_PROFILE_BADGES} sélectionné
            {selected.length > 1 ? "s" : ""}
            {" · "}
            {unlocked.length} débloqué{unlocked.length > 1 ? "s" : ""}
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
