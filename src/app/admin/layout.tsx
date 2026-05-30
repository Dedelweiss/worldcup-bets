import Link from "next/link";
import { Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth-server";
import { AppHeader } from "@/components/layout/app-header";

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
        <nav className="mb-8 flex gap-2">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
