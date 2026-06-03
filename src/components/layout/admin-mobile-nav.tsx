"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  PlusCircle,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Matchs", icon: LayoutGrid },
  { href: "/admin/leagues", label: "Ligues", icon: Trophy },
  { href: "/admin/users", label: "Joueurs", icon: Users },
  { href: "/admin/matches/new", label: "Créer", icon: PlusCircle },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      aria-label="Navigation administration"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-lime-400"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/dashboard"
        className="mx-auto flex max-w-lg items-center justify-center gap-1.5 border-t border-white/5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground"
      >
        <Shield className="size-3" aria-hidden />
        Retour à l&apos;app
      </Link>
    </nav>
  );
}
