import Link from "next/link";
import {
  CollectionCatalogPanel,
  CollectionQuickLinks,
} from "@/components/admin/collection-catalog-panel";
import { GrantAllCardsPanel } from "@/components/admin/grant-all-cards-panel";
import { PackCoinsAdminPanel } from "@/components/admin/pack-coins-admin-panel";
import { ShopPackDailyLimitPanel } from "@/components/admin/shop-pack-daily-limit-panel";
import { ResetPlayerAlbumPanel } from "@/components/admin/reset-player-album-panel";
import {
  getCollectionCatalogStats,
  getCollectionPlayers,
} from "@/lib/admin/collection";
import { requireAdmin } from "@/lib/auth-server";
import { formatPoints } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · Collection" };

async function getShopPackDailyLimit(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_config")
    .select("shop_pack_daily_limit")
    .eq("id", 1)
    .maybeSingle();

  return data?.shop_pack_daily_limit ?? 1;
}

export default async function AdminCollectionPage() {
  await requireAdmin();

  const [stats, players, shopPackDailyLimit] = await Promise.all([
    getCollectionCatalogStats(),
    getCollectionPlayers(),
    getShopPackDailyLimit(),
  ]);

  const totalJetons = players.reduce((sum, p) => sum + p.pack_coins, 0);
  const totalEclats = players.reduce((sum, p) => sum + p.card_shards, 0);
  const totalOwned = players.reduce((sum, p) => sum + p.ownedCards, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Collection & cartes</h1>
          <p className="text-sm text-muted-foreground">
            Catalogue, jetons packs, génération des cartes joueurs et reset
            d&apos;album par joueur.
          </p>
        </div>
        <CollectionQuickLinks />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Joueurs" value={players.length} />
        <SummaryTile
          label="Jetons en circulation"
          value={formatPoints(totalJetons)}
        />
        <SummaryTile
          label="Éclats en circulation"
          value={formatPoints(totalEclats)}
        />
        <SummaryTile label="Cartes possédées (total)" value={totalOwned} />
      </div>

      <CollectionCatalogPanel stats={stats} />

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          Jetons & éclats
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <PackCoinsAdminPanel players={players} />
          <ShopPackDailyLimitPanel dailyLimit={shopPackDailyLimit} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Albums joueurs</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <GrantAllCardsPanel
            players={players}
            totalCatalogCards={stats.totalCards}
          />
          <ResetPlayerAlbumPanel players={players} />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Les effectifs équipes se synchronisent depuis{" "}
        <Link href="/admin/teams" className="text-primary hover:underline">
          Admin · Équipes
        </Link>
        . Migration SQL requise :{" "}
        <code className="rounded bg-muted px-1 py-0.5">098_admin_collection.sql</code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5">099_admin_grant_all_cards.sql</code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5">100_card_catalog_cap.sql</code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5">102_align_card_counts.sql</code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5">103_consolidate_catalog.sql</code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5">104_shop.sql</code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5">105_admin_reset_shards.sql</code>
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
