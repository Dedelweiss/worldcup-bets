import { Shield } from "lucide-react";
import { AdminNav } from "@/components/layout/admin-nav";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/lib/auth-server";

const adminNav = [
  { href: "/admin", label: "Matchs" },
  { href: "/admin/leagues", label: "Ligues" },
  { href: "/admin/teams", label: "Équipes" },
  { href: "/admin/matches/new", label: "Créateur" },
  { href: "/admin/users", label: "Joueurs" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-full bg-background">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <Shield className="size-5" />
          <span className="font-semibold">Administration</span>
        </div>
        <AdminNav items={adminNav} />
        {children}
      </div>
    </div>
  );
}
