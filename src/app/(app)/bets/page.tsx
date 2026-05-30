import { requireAuth } from "@/lib/auth-server";

export const metadata = { title: "Mes paris · WC2026 Pool" };

export default async function BetsPage() {
  await requireAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mes paris</h1>
      <p className="text-muted-foreground">
        Aucun pari pour le moment. Placez votre premier pari depuis le tableau de bord.
      </p>
    </div>
  );
}
