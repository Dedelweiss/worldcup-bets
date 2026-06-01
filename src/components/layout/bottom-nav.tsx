"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/matches", label: "Matchs", icon: ListTodo },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/profile", label: "Profil", icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/matches") {
    return (
      pathname === "/matches" ||
      pathname.startsWith("/matches/") ||
      pathname.startsWith("/matches?") ||
      pathname === "/matches/quick"
    );
  }
  return pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-lime-400"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active && "drop-shadow-[0_0_8px_rgba(163,230,53,0.6)]",
                  )}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
