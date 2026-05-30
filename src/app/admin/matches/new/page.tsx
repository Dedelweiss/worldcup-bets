import { CreateMatchForm } from "@/components/admin/create-match-form";

export const metadata = { title: "Admin · Nouveau match" };

export default function NewMatchPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Créer un match</h1>
      <CreateMatchForm />
    </div>
  );
}
