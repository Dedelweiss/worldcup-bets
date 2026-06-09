"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import {
  Flag,
  Home,
  LayoutGrid,
  PlusCircle,
  ScrollText,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { bindHapticClick } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const tabs: {
  href: string;
  label: string;
  icon: LucideIcon;
  exit?: boolean;
}[] = [
  { href: "/admin", label: "Matchs", icon: LayoutGrid },
  { href: "/admin/leagues", label: "Ligues", icon: Trophy },
  { href: "/admin/teams", label: "Équipes", icon: Flag },
  { href: "/admin/matches/new", label: "Créateur", icon: PlusCircle },
  { href: "/admin/users", label: "Joueurs", icon: Users },
  { href: "/admin/logs", label: "Journal", icon: ScrollText },
  { href: "/dashboard", label: "Retour à l'app", icon: Home, exit: true },
];

const INDICATOR_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.75,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
      <nav
        className={cn(
          "pointer-events-auto relative mx-auto max-w-lg overflow-hidden rounded-[1.35rem]",
          "border border-white/12 bg-zinc-950/45 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]",
          "ring-1 ring-white/5 backdrop-blur-2xl backdrop-saturate-150",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:bg-gradient-to-b before:from-white/[0.09] before:to-transparent",
        )}
        aria-label="Navigation administration"
      >
        <LayoutGroup id="admin-bottom-nav">
          <ul className="relative flex items-stretch justify-around px-0.5 py-1">
            {tabs.map(({ href, label, icon: Icon, exit }) => {
              const active = isActive(pathname, href);

              return (
                <li key={href} className="relative min-w-0 flex-1">
                  {active && (
                    <motion.div
                      layoutId="admin-bottom-nav-active-pill"
                      className={cn(
                        "absolute inset-x-0.5 inset-y-0.5 rounded-2xl",
                        "bg-lime-400/14 shadow-[inset_0_0_16px_rgba(163,230,53,0.12)]",
                        "ring-1 ring-lime-400/25",
                      )}
                      transition={INDICATOR_SPRING}
                    />
                  )}

                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    onClick={bindHapticClick(undefined, exit ? "light" : "selection")}
                    className={cn(
                      "relative z-10 flex cursor-pointer items-center justify-center rounded-xl px-1 py-2.5 transition-colors duration-300",
                      active
                        ? "text-lime-300"
                        : exit
                          ? "text-zinc-400 hover:text-zinc-200"
                          : "text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    <motion.span
                      className="flex items-center justify-center"
                      animate={{ scale: active ? 1.08 : 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <Icon
                        className={cn(
                          "size-5 shrink-0 transition-[filter] duration-300",
                          active &&
                            "drop-shadow-[0_0_10px_rgba(163,230,53,0.55)]",
                        )}
                        aria-hidden
                      />
                    </motion.span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>
    </div>
  );
}
