"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  items: NavItem[];
  showAdmin?: boolean;
}

export function MobileNav({ items, showAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const drawer =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              aria-label="Fermer le menu"
              onClick={() => setOpen(false)}
            />

            <nav
              className="absolute inset-y-0 right-0 z-10 flex w-[min(85vw,300px)] flex-col border-l border-border bg-background shadow-2xl"
              aria-label="Navigation principale"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
                  aria-label="Fermer le menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                {showAdmin && (
                  <li>
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                        pathname.startsWith("/admin")
                          ? "bg-primary/15 text-primary"
                          : "text-primary hover:bg-primary/10",
                      )}
                    >
                      Admin
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {drawer}
    </div>
  );
}
