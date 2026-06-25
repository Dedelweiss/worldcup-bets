import Link from "next/link";
import { ShopClient } from "@/components/shop/shop-client";
import { requireAuth } from "@/lib/auth-server";
import { getShopData } from "@/lib/cards/shop-data";

export const metadata = { title: "Boutique · WC2026 Pool" };

export default async function ShopPage() {
  const profile = await requireAuth();
  const data = await getShopData(profile.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Boutique</h1>
          <p className="text-sm text-muted-foreground">
            Dépensez vos jetons et éclats pour compléter votre album.
          </p>
        </div>
        <Link
          href="/collection"
          className="text-sm font-medium text-primary hover:underline"
        >
          Mon album →
        </Link>
      </div>
      <ShopClient data={data} />
    </div>
  );
}
