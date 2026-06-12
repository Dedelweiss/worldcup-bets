import { Shield } from "lucide-react";
import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { AdminNav } from "@/components/layout/admin-nav";
import { AppHeader } from "@/components/layout/app-header";
import { getProfile, requireAdmin } from "@/lib/auth-server";

const adminNav = [
  { href: "/admin", label: "Matchs" },
  { href: "/admin/pronos", label: "Pronos" },
  { href: "/admin/leagues", label: "Ligues" },
  { href: "/admin/teams", label: "Équipes" },
  { href: "/admin/matches/new", label: "Créateur" },
  { href: "/admin/users", label: "Joueurs" },
  { href: "/admin/logs", label: "Journal" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const profile = await getProfile();

  return (
    <div className="min-h-full bg-zinc-950">
      <AppHeader profile={profile} />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <Shield className="size-5" />
          <span className="font-semibold">Administration</span>
        </div>
        <div className="hidden md:block">
          <AdminNav items={adminNav} />
        </div>
        {children}
      </div>
      <AdminMobileNav />
    </div>
  );
}
