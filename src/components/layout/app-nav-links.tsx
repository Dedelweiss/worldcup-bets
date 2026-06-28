"use client";

import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";
import { NavFunBadge } from "@/components/layout/nav-fun-badge";
import { bindHapticClick } from "@/lib/haptics";
import { isNavItemActive } from "@/lib/sport/nav-active";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/app-nav";

interface AppNavLinksProps {
  items: NavItem[];
  showAdmin?: boolean;
  variant?: "desktop" | "mobile" | "sidebar";
  onNavigate?: () => void;
}

export function AppNavLinks({
  items,
  showAdmin,
  variant = "desktop",
  onNavigate,
}: AppNavLinksProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    return isNavItemActive(pathname, href);
  }

  const linkClass =
    variant === "sidebar"
      ? "flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      : variant === "desktop"
        ? "cursor-pointer rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        : cn(
            "block cursor-pointer rounded-lg px-4 py-3 text-base font-medium transition-colors",
            "text-foreground hover:bg-muted",
          );

  return (
    <>
      {items.map((item) => {
        const active = isActive(item.href);
        const isFun = item.href === "/matches/fun";

        const link = (
          <NavLink
            href={item.href}
            onClick={bindHapticClick(onNavigate, "light")}
            className={cn(
              linkClass,
              variant === "mobile" &&
                active &&
                "bg-primary/15 text-primary",
              variant === "sidebar" &&
                active &&
                "bg-lime-400/10 text-lime-400 shadow-[inset_0_0_0_1px_rgb(163_230_53/0.25)]",
              variant === "desktop" && active && "bg-muted text-foreground",
              isFun && "relative",
            )}
          >
            {item.label}
            {isFun && <NavFunBadge />}
          </NavLink>
        );

        if (variant === "mobile") {
          return <li key={item.href}>{link}</li>;
        }
        if (variant === "sidebar") {
          return (
            <div key={item.href} className="w-full">
              {link}
            </div>
          );
        }
        return (
          <span key={item.href} className="contents">
            {link}
          </span>
        );
      })}
      {showAdmin &&
        (variant === "mobile" ? (
          <li className="mt-2 border-t border-border pt-2">
            <NavLink
              href="/admin"
              onClick={bindHapticClick(onNavigate, "light")}
              className={cn(
                linkClass,
                "flex items-center gap-2 border border-lime-400/30 bg-lime-400/10 font-semibold text-lime-400 hover:bg-lime-400/15",
                pathname.startsWith("/admin") && "ring-1 ring-lime-400/40",
              )}
            >
              <Shield className="size-4 shrink-0" aria-hidden />
              Administration
            </NavLink>
          </li>
        ) : variant === "sidebar" ? (
          <div className="w-full">
            <NavLink
              href="/admin"
              onClick={bindHapticClick(onNavigate, "light")}
              className={cn(
                linkClass,
                pathname.startsWith("/admin") &&
                  "bg-lime-400/10 text-lime-400",
                !pathname.startsWith("/admin") && "text-lime-400/90 hover:bg-lime-400/10",
              )}
            >
              Admin
            </NavLink>
          </div>
        ) : (
          <NavLink
            href="/admin"
            onClick={bindHapticClick(onNavigate, "light")}
            className={cn(
              linkClass,
              "text-primary hover:bg-primary/10",
              pathname.startsWith("/admin") && "bg-muted text-foreground",
            )}
          >
            Admin
          </NavLink>
        ))}
    </>
  );
}
