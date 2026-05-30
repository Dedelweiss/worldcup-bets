import { BetList } from "@/components/bets/bet-list";
import { requireAuth } from "@/lib/auth-server";
import { getUserBets } from "@/lib/bets";

export const metadata = { title: "Mes paris · WC2026 Pool" };

export default async function BetsPage() {
  const profile = await requireAuth();
  const bets = await getUserBets(profile.id);

  const pending = bets.filter((b) => b.status === "pending").length;
  const won = bets.filter((b) => b.status === "won").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes paris</h1>
        <p className="text-sm text-muted-foreground">
          {pending} en cours · {won} gagné{won !== 1 ? "s" : ""}
        </p>
      </div>
      <BetList bets={bets} />
    </div>
  );
}
