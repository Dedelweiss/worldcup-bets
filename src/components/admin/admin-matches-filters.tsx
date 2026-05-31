"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  type AdminMatchSortField,
  type AdminMatchSortOrder,
  nextSortOrder,
} from "@/lib/admin/match-sort";
import { cn } from "@/lib/utils";

const SORT_FIELD_OPTIONS: { value: AdminMatchSortField; label: string }[] = [
  { value: "date", label: "Date de coup d'envoi" },
  { value: "status", label: "Statut" },
];

interface AdminMatchesFiltersProps {
  sortField: AdminMatchSortField;
  sortOrder: AdminMatchSortOrder;
}

export function AdminMatchesFilters({
  sortField,
  sortOrder,
}: AdminMatchesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const pushSort = useCallback(
    (field: AdminMatchSortField, order: AdminMatchSortOrder) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("sort", field);
      p.set("order", order);
      startTransition(() => {
        router.push(`/admin?${p.toString()}`);
      });
    },
    [router, searchParams],
  );

  function onFieldChange(nextField: AdminMatchSortField) {
    pushSort(
      nextField,
      nextField === sortField
        ? sortOrder
        : nextField === "date"
          ? "desc"
          : "asc",
    );
  }

  function toggleOrder() {
    pushSort(sortField, sortOrder === "asc" ? "desc" : "asc");
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4 sm:flex-row sm:items-end sm:justify-between",
        pending && "opacity-60",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="admin-match-sort-field"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Trier par
          </label>
          <Select
            id="admin-match-sort-field"
            value={sortField}
            onChange={(e) =>
              onFieldChange(e.target.value as AdminMatchSortField)
            }
          >
            {SORT_FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ordre
          </span>
          <button
            type="button"
            onClick={toggleOrder}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            {sortOrder === "asc" ? (
              <>
                <ArrowUp className="size-4" aria-hidden />
                Croissant
              </>
            ) : (
              <>
                <ArrowDown className="size-4" aria-hidden />
                Décroissant
              </>
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground sm:max-w-xs sm:text-right">
        {sortField === "date"
          ? "Décroissant = matchs les plus récents en premier."
          : "Croissant = En direct, puis À venir, Terminé…"}
      </p>
    </div>
  );
}

interface AdminMatchSortHeaderProps {
  column: AdminMatchSortField;
  label: string;
  sortField: AdminMatchSortField;
  sortOrder: AdminMatchSortOrder;
  className?: string;
}

export function AdminMatchSortHeader({
  column,
  label,
  sortField,
  sortOrder,
  className,
}: AdminMatchSortHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const active = sortField === column;

  function handleClick() {
    const order = nextSortOrder(column, sortField, sortOrder);
    const p = new URLSearchParams(searchParams.toString());
    p.set("sort", column);
    p.set("order", order);
    startTransition(() => {
      router.push(`/admin?${p.toString()}`);
    });
  }

  return (
    <th className={cn("px-4 py-3 font-medium", className)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          pending && "opacity-60",
        )}
      >
        {label}
        {active &&
          (sortOrder === "asc" ? (
            <ArrowUp className="size-3.5" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5" aria-hidden />
          ))}
      </button>
    </th>
  );
}
