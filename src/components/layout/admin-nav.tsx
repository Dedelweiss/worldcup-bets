"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavGroups, isAdminNavActive } from "@/lib/admin/nav";
import { bindHapticClick } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 space-y-5" aria-label="Sections administration">
      {adminNavGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const active = isAdminNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={bindHapticClick(undefined, "light")}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
