"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CircleHelp, Menu, X } from "lucide-react";
import { AppNavLinks } from "@/components/layout/app-nav-links";
import { bindHapticClick } from "@/lib/haptics";

import type { NavItem } from "@/components/layout/app-nav";

export type { NavItem };

interface MobileNavProps {
  items: NavItem[];
  showAdmin?: boolean;
}

export function MobileNav({ items, showAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            className="fixed inset-0 z-[200] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              aria-label="Fermer le menu"
              onClick={bindHapticClick(() => setOpen(false), "light")}
            />

            <nav
              className="absolute inset-y-0 right-0 z-10 flex w-[min(85vw,300px)] flex-col border-l border-border bg-background shadow-2xl"
              aria-label="Navigation principale"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={bindHapticClick(() => setOpen(false), "light")}
                  className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
                  aria-label="Fermer le menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                <AppNavLinks
                  items={items}
                  showAdmin={showAdmin}
                  variant="mobile"
                  onNavigate={() => setOpen(false)}
                />
              </ul>
              <div className="shrink-0 border-t border-border p-3">
                <Link
                  href="/help"
                  onClick={bindHapticClick(() => setOpen(false), "light")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <CircleHelp className="size-4" />
                  Aide & règles
                </Link>
              </div>
            </nav>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={bindHapticClick(() => setOpen((v) => !v), "medium")}
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
