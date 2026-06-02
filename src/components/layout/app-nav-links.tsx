"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavFunBadge } from "@/components/layout/nav-fun-badge";
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
    if (pathname === href) return true;
    if (href === "/dashboard") return false;
    if (href === "/matches") {
      return pathname === "/matches" || pathname.startsWith("/matches?");
    }
    return pathname.startsWith(`${href}/`);
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
          <Link
            href={item.href}
            onClick={onNavigate}
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
          </Link>
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
          <li>
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                linkClass,
                pathname.startsWith("/admin") &&
                  "bg-primary/15 text-primary",
                !pathname.startsWith("/admin") && "text-primary hover:bg-primary/10",
              )}
            >
              Admin
            </Link>
          </li>
        ) : variant === "sidebar" ? (
          <div className="w-full">
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                linkClass,
                pathname.startsWith("/admin") &&
                  "bg-lime-400/10 text-lime-400",
                !pathname.startsWith("/admin") && "text-lime-400/90 hover:bg-lime-400/10",
              )}
            >
              Admin
            </Link>
          </div>
        ) : (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              linkClass,
              "text-primary hover:bg-primary/10",
              pathname.startsWith("/admin") && "bg-muted text-foreground",
            )}
          >
            Admin
          </Link>
        ))}
    </>
  );
}
