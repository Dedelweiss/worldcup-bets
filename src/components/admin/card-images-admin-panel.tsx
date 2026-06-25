"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { CardImagePreviewModal } from "@/components/admin/card-image-preview-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RARITY_LABEL } from "@/lib/cards/styles";
import type {
  CardImageAdminStats,
  CardImageListFilter,
  CardImageListPage,
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
  initialList,
}: {
  initialStats: CardImageAdminStats;
  initialList: CardImageListPage;
}) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<CardImageListFilter>(initialList.filter);
  const [page, setPage] = useState(initialList.page);
  const [searchInput, setSearchInput] = useState(initialList.search);
  const [search, setSearch] = useState(initialList.search);
  const [stats, setStats] = useState(initialStats);
  const [list, setList] = useState(initialList);
  const [error, setError] = useState<string | null>(null);
  const [quotaInput, setQuotaInput] = useState(String(initialStats.quota.limit));
  const [previewRow, setPreviewRow] = useState<CardImageListRow | null>(null);
  const [autoPoll, setAutoPoll] = useState(true);

  const cards = list.cards;

  const reload = useCallback(
    async (opts?: {
      nextFilter?: CardImageListFilter;
      nextPage?: number;
      nextSearch?: string;
    }) => {
      const res = await getCardImagesAdminDataAction(
        opts?.nextFilter ?? filter,
        opts?.nextPage ?? page,
        list.pageSize,
        opts?.nextSearch ?? search,
      );
      if (res.success) {
        setStats(res.stats);
        setList(res.list);
        setFilter(res.list.filter);
        setPage(res.list.page);
        setSearch(res.list.search);
        setSearchInput(res.list.search);
      } else {
        setError(res.error);
      }
    },
    [filter, page, search, list.pageSize],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (searchInput === search) return;
      startTransition(() => {
        void reload({ nextSearch: searchInput, nextPage: 1 });
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [searchInput, search, reload]);

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

  function handleFilterChange(next: CardImageListFilter) {
    setFilter(next);
    setPage(1);
    startTransition(async () => {
      await reload({ nextFilter: next, nextPage: 1 });
    });
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || (list.totalPages > 0 && nextPage > list.totalPages)) {
      return;
    }
    setPage(nextPage);
    startTransition(async () => {
      await reload({ nextPage });
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

  const rangeStart = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const rangeEnd = Math.min(list.page * list.pageSize, list.total);

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par nom ou code (ex. Ezzalzouli)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

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
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {list.total === 0
            ? "Aucun résultat"
            : `${rangeStart}–${rangeEnd} sur ${list.total} carte${list.total > 1 ? "s" : ""}`}
          {search ? ` · recherche « ${search} »` : ""}
        </span>
        <label className="flex items-center gap-2">
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
                  {search
                    ? "Aucune carte ne correspond à cette recherche."
                    : "Aucune carte pour ce filtre."}
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

      {list.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || list.page <= 1}
            onClick={() => handlePageChange(list.page - 1)}
          >
            <ChevronLeft className="size-4" />
            Précédent
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {list.page} / {list.totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || list.page >= list.totalPages}
            onClick={() => handlePageChange(list.page + 1)}
          >
            Suivant
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

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
