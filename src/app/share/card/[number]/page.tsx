import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareCardPreview } from "@/components/collection/share-card-preview";
import { buttonVariants } from "@/components/ui/button";
import { fetchCatalogCardByNumber } from "@/lib/cards/catalog-query";
import {
  buildCardShareText,
  SITE_PRODUCT_NAME,
} from "@/lib/cards/card-share";
import { RARITY_LABEL, RARITY_STYLE } from "@/lib/cards/styles";
import type { CardRarity, CardStats } from "@/lib/cards/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

async function loadShareCard(catalogNumber: number) {
  try {
    const supabase = createAdminClient();
    return fetchCatalogCardByNumber(supabase, catalogNumber);
  } catch {
    return null;
  }
}

function parseStats(raw: Record<string, unknown> | null): CardStats | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as CardStats;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number: raw } = await params;
  const catalogNumber = Number.parseInt(raw, 10);
  const card = Number.isFinite(catalogNumber)
    ? await loadShareCard(catalogNumber)
    : null;

  if (!card) {
    return { title: `Carte introuvable · ${SITE_PRODUCT_NAME}` };
  }

  const description = buildCardShareText({
    name: card.name,
    rarity: card.rarity as CardRarity,
  });

  return {
    title: `${card.name} · ${RARITY_LABEL[card.rarity as CardRarity]} · ${SITE_PRODUCT_NAME}`,
    description,
    openGraph: {
      title: `${card.name} — ${RARITY_LABEL[card.rarity as CardRarity]}`,
      description,
      type: "website",
    },
  };
}

export default async function ShareCardPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number: raw } = await params;
  const catalogNumber = Number.parseInt(raw, 10);
  if (!Number.isFinite(catalogNumber) || catalogNumber < 1) notFound();

  const card = await loadShareCard(catalogNumber);
  if (!card) notFound();

  const rarity = card.rarity as CardRarity;
  const style = RARITY_STYLE[rarity];
  const stats = parseStats(card.stats);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Carte partagée · n°{catalogNumber}
      </p>

      <ShareCardPreview
        name={card.name}
        rarity={rarity}
        category={card.category}
        countryCode={card.country_code}
        position={card.position}
        stats={stats}
        imagePath={card.image_path}
        catalogNumber={catalogNumber}
      />

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {card.name}
        </h1>
        <p className={cn("text-xs font-bold uppercase tracking-[0.2em]", style.text)}>
          {RARITY_LABEL[rarity]}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {buildCardShareText({ name: card.name, rarity })}
      </p>

      <Link
        href="/signup"
        className={cn(buttonVariants({ size: "lg" }), "w-full max-w-xs")}
      >
        Rejoindre {SITE_PRODUCT_NAME}
      </Link>
    </div>
  );
}
