"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Popover({ open, onOpenChange, children }: PopoverProps) {
  return (
    <PopoverContext.Provider value={{ open: open ?? false, onOpenChange }}>
      {children}
    </PopoverContext.Provider>
  );
}

interface PopoverContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
});

function PopoverTrigger({
  children,
  className,
  asChild,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, onOpenChange } = React.useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => onOpenChange?.(!open),
    });
  }

  return (
    <button
      type="button"
      data-slot="popover-trigger"
      aria-expanded={open}
      className={className}
      onClick={() => onOpenChange?.(!open)}
      {...props}
    >
      {children}
    </button>
  );
}

function PopoverContent({
  className,
  align = "center",
  children,
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "center" | "end" }) {
  const { open, onOpenChange } = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const trigger = ref.current.parentElement?.querySelector(
          '[data-slot="popover-trigger"]',
        );
        if (trigger?.contains(e.target as Node)) return;
        onOpenChange?.(false);
      }
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange?.(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      data-slot="popover-content"
      className={cn(
        "absolute z-50 mt-2 w-72 rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg shadow-primary/10 animate-in fade-in-0 zoom-in-95",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
