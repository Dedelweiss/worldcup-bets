"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { Home, Menu, X } from "lucide-react";
import {
  adminMobilePrimaryTabs,
  adminNavGroups,
  isAdminDrawerRoute,
  isAdminNavActive,
} from "@/lib/admin/nav";
import { bindHapticClick } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const INDICATOR_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.75,
};

export function AdminMobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerActive = isAdminDrawerRoute(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const drawer =
    drawerOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu administration"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              aria-label="Fermer le menu"
              onClick={bindHapticClick(() => setDrawerOpen(false), "light")}
            />

            <nav
              className="absolute inset-y-0 right-0 z-10 flex w-[min(88vw,320px)] flex-col border-l border-white/10 bg-zinc-950 shadow-2xl"
              aria-label="Navigation administration"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <span className="text-sm font-semibold text-zinc-100">
                  Administration
                </span>
                <button
                  type="button"
                  onClick={bindHapticClick(() => setDrawerOpen(false), "light")}
                  className="inline-flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  aria-label="Fermer le menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {adminNavGroups.map((group) => (
                  <div key={group.title} className="mb-5 last:mb-0">
                    <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {group.title}
                    </p>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isAdminNavActive(pathname, item.href);
                        const Icon = item.icon;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={bindHapticClick(
                                () => setDrawerOpen(false),
                                "light",
                              )}
                              className={cn(
                                "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                                active
                                  ? "bg-lime-400/10 text-lime-300 ring-1 ring-lime-400/25"
                                  : "text-zinc-300 hover:bg-white/5",
                              )}
                            >
                              <Icon
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">
                                  {item.label}
                                </span>
                                {item.description ? (
                                  <span className="mt-0.5 block text-xs text-zinc-500">
                                    {item.description}
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="shrink-0 border-t border-white/10 p-3">
                <Link
                  href="/dashboard"
                  onClick={bindHapticClick(() => setDrawerOpen(false), "light")}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
                >
                  <Home className="size-4 shrink-0" aria-hidden />
                  Retour à l&apos;app
                </Link>
              </div>
            </nav>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
        <nav
          className={cn(
            "pointer-events-auto relative mx-auto max-w-md overflow-hidden rounded-[1.35rem]",
            "border border-white/12 bg-zinc-950/45 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]",
            "ring-1 ring-white/5 backdrop-blur-2xl backdrop-saturate-150",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
            "before:bg-gradient-to-b before:from-white/[0.09] before:to-transparent",
          )}
          aria-label="Navigation administration rapide"
        >
          <LayoutGroup id="admin-bottom-nav">
            <ul className="relative flex items-stretch justify-around px-0.5 py-1">
              {adminMobilePrimaryTabs.map(({ href, label, icon: Icon }) => {
                const active = isAdminNavActive(pathname, href);

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
                      onClick={bindHapticClick(undefined, "selection")}
                      className={cn(
                        "relative z-10 flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 transition-colors duration-300",
                        active ? "text-lime-300" : "text-zinc-500",
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
                      <span className="text-[10px] font-medium leading-none">
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}

              <li className="relative min-w-0 flex-1">
                {(drawerOpen || drawerActive) && (
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

                <button
                  type="button"
                  aria-label="Plus de sections admin"
                  aria-expanded={drawerOpen}
                  aria-current={drawerActive ? "page" : undefined}
                  onClick={bindHapticClick(() => setDrawerOpen(true), "light")}
                  className={cn(
                    "relative z-10 flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 transition-colors duration-300",
                    drawerOpen || drawerActive
                      ? "text-lime-300"
                      : "text-zinc-500",
                  )}
                >
                  <Menu className="size-5 shrink-0" aria-hidden />
                  <span className="text-[10px] font-medium leading-none">
                    Plus
                  </span>
                </button>
              </li>
            </ul>
          </LayoutGroup>
        </nav>
      </div>
      {drawer}
    </>
  );
}
