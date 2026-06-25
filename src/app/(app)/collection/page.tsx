import Link from "next/link";
import { CollectionClient } from "@/components/collection/collection-client";
import { requireAuth } from "@/lib/auth-server";
import { getCollectionData } from "@/lib/cards/data";

export const metadata = { title: "Collection · WC2026 Pool" };

export default async function CollectionPage() {
  const profile = await requireAuth();
  const data = await getCollectionData(profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Collection</h1>
        <p className="text-sm text-muted-foreground">
          Complète ton album et ouvre tes packs. Achète-en de nouveaux à la{" "}
          <Link href="/shop" className="text-primary hover:underline">
            boutique
          </Link>
          . Un prono gagné peut aussi te faire gagner un pack.
        </p>
      </div>
      <CollectionClient data={data} />
      <p className="border-t border-border/60 pt-4 text-[11px] leading-snug text-muted-foreground">
        Données factuelles (noms, postes, statistiques publiques). Cartes
        illustratives sans photo ni logo officiel. Non affilié à la FIFA, aux
        fédérations ni aux joueurs.
      </p>
    </div>
  );
}
