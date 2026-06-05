"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, FileJson, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AppLogEntry, AppLogLevel } from "@/lib/logging/app-logger";
import { cn } from "@/lib/utils";

const LEVELS: { value: AppLogLevel | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "error", label: "Erreurs" },
  { value: "warn", label: "Avertissements" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
];

const LEVEL_VARIANT: Record<
  AppLogLevel,
  "default" | "secondary" | "outline" | "destructive"
> = {
  error: "destructive",
  warn: "outline",
  info: "secondary",
  debug: "secondary",
};

interface AppLogsPanelProps {
  logs: AppLogEntry[];
  total: number;
  filters: {
    level: AppLogLevel | "all";
    source: string;
    search: string;
    from: string;
    to: string;
    page: number;
  };
  pageSize: number;
  migrationMissing: boolean;
}

function buildExportUrl(
  format: "csv" | "json",
  filters: AppLogsPanelProps["filters"],
): string {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters.level !== "all") params.set("level", filters.level);
  if (filters.source.trim()) params.set("source", filters.source.trim());
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return `/api/admin/logs/export?${params.toString()}`;
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AppLogsPanel({
  logs,
  total,
  filters,
  pageSize,
  migrationMissing,
}: AppLogsPanelProps) {
  const router = useRouter();
  const [level, setLevel] = useState(filters.level);
  const [source, setSource] = useState(filters.source);
  const [search, setSearch] = useState(filters.search);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentFilters = useMemo(
    () => ({ level, source, search, from, to, page: filters.page }),
    [level, source, search, from, to, filters.page],
  );

  function applyFilters(page = 1) {
    const params = new URLSearchParams();
    if (level !== "all") params.set("level", level);
    if (source.trim()) params.set("source", source.trim());
    if (search.trim()) params.set("search", search.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.push(qs ? `/admin/logs?${qs}` : "/admin/logs");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ScrollText className="size-6 text-primary" aria-hidden />
            Journal applicatif
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sync API, actions admin, IA et erreurs serveur — {total} entrée
            {total !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={buildExportUrl("csv", currentFilters)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </a>
          <a
            href={buildExportUrl("json", currentFilters)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <FileJson className="size-4" aria-hidden />
            Export JSON
          </a>
        </div>
      </div>

      {migrationMissing && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-amber-200">
            Table <code className="text-xs">app_logs</code> absente — exécutez la
            migration{" "}
            <code className="text-xs">069_app_logs.sql</code> dans Supabase.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters(1);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="logLevel">Niveau</Label>
              <Select
                id="logLevel"
                value={level}
                onChange={(e) =>
                  setLevel(e.target.value as AppLogLevel | "all")
                }
                className="h-9 bg-background"
              >
                {LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logSource">Source</Label>
              <Input
                id="logSource"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="ex. sync.football-data"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logSearch">Recherche</Label>
              <Input
                id="logSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Message ou source…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logFrom">Du</Label>
              <Input
                id="logFrom"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logTo">Au</Label>
              <Input
                id="logTo"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Filtrer</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/admin/logs")}
              >
                Réinitialiser
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Aucun log pour ces filtres. Les nouveaux événements apparaîtront ici.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="flex shrink-0 items-center gap-2 sm:w-44 sm:flex-col sm:items-start">
                  <Badge variant={LEVEL_VARIANT[log.level]}>{log.level}</Badge>
                  <time
                    className="text-xs tabular-nums text-muted-foreground"
                    dateTime={log.created_at}
                  >
                    {formatLogTime(log.created_at)}
                  </time>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-mono text-xs text-lime-400/90">{log.source}</p>
                  <p className="whitespace-pre-wrap break-words text-foreground/90">
                    {log.message}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="max-h-32 overflow-auto rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Page {filters.page} / {totalPages}
          </p>
          <div className="flex gap-2">
            {filters.page > 1 && (
              <Link
                href={`/admin/logs?${new URLSearchParams({
                  ...(level !== "all" ? { level } : {}),
                  ...(source.trim() ? { source: source.trim() } : {}),
                  ...(search.trim() ? { search: search.trim() } : {}),
                  ...(from ? { from } : {}),
                  ...(to ? { to } : {}),
                  page: String(filters.page - 1),
                }).toString()}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Précédent
              </Link>
            )}
            {filters.page < totalPages && (
              <Link
                href={`/admin/logs?${new URLSearchParams({
                  ...(level !== "all" ? { level } : {}),
                  ...(source.trim() ? { source: source.trim() } : {}),
                  ...(search.trim() ? { search: search.trim() } : {}),
                  ...(from ? { from } : {}),
                  ...(to ? { to } : {}),
                  page: String(filters.page + 1),
                }).toString()}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Suivant
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
