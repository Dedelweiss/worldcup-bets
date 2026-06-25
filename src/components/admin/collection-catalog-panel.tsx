"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GenerateCardsButton } from "@/components/admin/generate-cards-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CollectionCatalogStats } from "@/lib/admin/collection";

export function CollectionCatalogPanel({
  stats,
}: {
  stats: CollectionCatalogStats;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Catalogue & génération</CardTitle>
        <p className="text-xs text-muted-foreground">
          Synchronise les effectifs (football-data) puis génère les cartes
          joueurs dans le catalogue. Prérequis : équipes liées sur{" "}
          <Link href="/admin/teams" className="text-primary hover:underline">
            Équipes
          </Link>
          .
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Cartes totales" value={stats.totalCards} />
          <Stat label="Nations" value={stats.nationCards} />
          <Stat label="Joueurs" value={stats.playerCards} />
          <Stat label="Types de packs" value={stats.packTypes} />
        </dl>
        <GenerateCardsButton />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-raised)]/50 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function CollectionQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/collection"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Voir la collection (joueur)
      </Link>
      <Link
        href="/admin/card-images"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Images IA
      </Link>
    </div>
  );
}
