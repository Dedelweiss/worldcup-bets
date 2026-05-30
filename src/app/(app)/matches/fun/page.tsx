import { FunBetsFeed } from "@/components/fun-bets/fun-bets-feed";
import { getOpenFunMarketsFeed } from "@/lib/fun-markets";

export const metadata = { title: "Paris fun · WC2026 Pool" };

export default async function FunBetsPage() {
  const items = await getOpenFunMarketsFeed();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paris fun</h1>
        <p className="text-muted-foreground">
          Paris spéciaux ouverts par l&apos;admin — souvent pendant les matchs en
          direct.
        </p>
      </div>
      <FunBetsFeed items={items} />
    </div>
  );
}
