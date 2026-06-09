"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bindHapticClick } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/mobile-nav";

interface AdminNavProps {
  items: NavItem[];
}

export function AdminNav({ items }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mb-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max min-w-full gap-2 pb-1 sm:flex-wrap sm:w-auto">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={bindHapticClick(undefined, "light")}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
