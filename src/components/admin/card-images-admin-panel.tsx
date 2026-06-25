"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ImageIcon, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { CardImagePreviewModal } from "@/components/admin/card-image-preview-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RARITY_LABEL } from "@/lib/cards/styles";
import type {
  CardImageAdminStats,
  CardImageListRow,
} from "@/lib/cards/card-image-types";
import { cardImagePublicUrl, resolveJobPreviewUrl } from "@/lib/cards/card-image-urls";
import {
  getCardImagesAdminDataAction,
  pollCardImageJobsAction,
  queueCardImageBatchAction,
  queueCardImageJobAction,
  setCardImageDailyQuotaAction,
} from "@/app/admin/card-images/actions";
import { cn } from "@/lib/utils";

type Filter = "all" | "missing" | "has_image" | "pending";

const STATUS_LABEL: Record<string, string> = {
  queued: "En file",
  generating: "Génération…",
  ready: "Preview prête",
  approved: "Publiée",
  failed: "Échec",
  cancelled: "Annulée",
};

export function CardImagesAdminPanel({
  initialStats,
  initialCards,
  initialFilter,
}: {
  initialStats: CardImageAdminStats;
  initialCards: CardImageListRow[];
  initialFilter: Filter;
}) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [stats, setStats] = useState(initialStats);
  const [cards, setCards] = useState(initialCards);
  const [error, setError] = useState<string | null>(null);
  const [quotaInput, setQuotaInput] = useState(String(initialStats.quota.limit));
  const [previewRow, setPreviewRow] = useState<CardImageListRow | null>(null);
  const [autoPoll, setAutoPoll] = useState(true);

  const reload = useCallback(
    async (nextFilter: Filter = filter) => {
      const res = await getCardImagesAdminDataAction(nextFilter);
      if (res.success) {
        setStats(res.stats);
        setCards(res.cards);
      } else {
        setError(res.error);
      }
    },
    [filter],
  );

  const hasActiveJobs =
    stats.activeJobs > 0 ||
    cards.some((c) =>
      ["queued", "generating"].includes(c.job?.status ?? ""),
    );

  const pollJobs = useCallback(async () => {
    const res = await pollCardImageJobsAction();
    if (res.success) {
      await reload();
    }
    return res;
  }, [reload]);

  useEffect(() => {
    if (!autoPoll || !hasActiveJobs) return;

    const id = window.setInterval(() => {
      void pollJobs();
    }, 8000);

    return () => window.clearInterval(id);
  }, [autoPoll, hasActiveJobs, pollJobs]);

  function handleFilterChange(next: Filter) {
    setFilter(next);
    startTransition(async () => {
      await reload(next);
    });
  }

  async function handleBatch() {
    setError(null);
    const res = await queueCardImageBatchAction(20);
    if (!res.success) {
      setError(res.error);
      return;
    }
    await reload();
  }

  async function handleGenerate(cardId: string) {
    setError(null);
    const res = await queueCardImageJobAction(cardId);
    if (!res.success) {
      setError(res.error);
      return;
    }
    await reload();
  }

  async function handleSaveQuota(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(quotaInput);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Quota invalide (entier ≥ 0).");
      return;
    }
    const res = await setCardImageDailyQuotaAction(parsed);
    if (!res.success) {
      setError(res.error);
      return;
    }
    await reload();
  }

  const previewUrl = previewRow
    ? resolveJobPreviewUrl(previewRow.job)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Cartes actives" value={stats.totalCards} />
        <StatTile label="Avec image" value={stats.withImage} />
        <StatTile label="Sans image" value={stats.withoutImage} />
        <StatTile label="Jobs actifs" value={stats.activeJobs} />
        <StatTile label="Previews prêtes" value={stats.readyJobs} />
      </div>

      {!stats.leonardoConfigured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Ajoutez <code className="text-xs">LEONARDO_API_KEY</code> dans
          .env.local pour lancer les générations.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" aria-hidden />
            Quota & batch
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <form onSubmit={handleSaveQuota} className="flex flex-col gap-2">
            <Label htmlFor="image-quota">Jobs / jour</Label>
            <div className="flex gap-2">
              <Input
                id="image-quota"
                type="number"
                min={0}
                className="h-9 w-24"
                value={quotaInput}
                onChange={(e) => setQuotaInput(e.target.value)}
              />
              <Button type="submit" size="sm" variant="outline">
                OK
              </Button>
            </div>
          </form>

          <div className="text-sm text-muted-foreground">
            {stats.quota.unlimited ? (
              "Quota illimité"
            ) : (
              <>
                {stats.quota.used}/{stats.quota.limit} utilisés aujourd&apos;hui
                {stats.quota.remaining != null &&
                  ` · ${stats.quota.remaining} restants`}
              </>
            )}
          </div>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void pollJobs()}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Rafraîchir jobs
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !stats.leonardoConfigured}
              onClick={() => void handleBatch()}
            >
              <Wand2 className="mr-1.5 size-3.5" />
              Batch 20 sans image
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["missing", "Sans image"],
            ["pending", "En cours"],
            ["has_image", "Avec image"],
            ["all", "Toutes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleFilterChange(id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={autoPoll}
            onChange={(e) => setAutoPoll(e.target.checked)}
          />
          Poll auto (8s)
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Carte</th>
              <th className="px-3 py-2">Rareté</th>
              <th className="px-3 py-2">Image</th>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Aucune carte pour ce filtre.
                </td>
              </tr>
            ) : (
              cards.map((row) => {
                const thumb = row.image_path
                  ? cardImagePublicUrl(row.image_path)
                  : null;
                const jobPreview = resolveJobPreviewUrl(row.job);
                const isBusy = ["queued", "generating"].includes(
                  row.job?.status ?? "",
                );

                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.code}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {RARITY_LABEL[row.rarity]}
                    </td>
                    <td className="px-3 py-2">
                      {thumb ? (
                        <div className="relative h-12 w-9 overflow-hidden rounded border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.job ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium">
                            {STATUS_LABEL[row.job.status] ?? row.job.status}
                          </span>
                          {row.job.error_message && (
                            <p className="line-clamp-2 text-[10px] text-destructive">
                              {row.job.error_message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        {row.job?.status === "ready" && jobPreview && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewRow(row)}
                          >
                            Preview
                          </Button>
                        )}
                        {!row.image_path && !isBusy && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending || !stats.leonardoConfigured}
                            onClick={() => void handleGenerate(row.id)}
                          >
                            {isBusy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <>
                                <ImageIcon className="mr-1 size-3.5" />
                                Générer
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {previewRow && previewUrl && (
        <CardImagePreviewModal
          row={previewRow}
          previewUrl={previewUrl}
          open
          onClose={() => setPreviewRow(null)}
          onUpdated={() => void reload()}
        />
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
