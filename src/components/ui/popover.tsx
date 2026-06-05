"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  triggerRef: { current: null },
});

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Popover({ open, onOpenChange, children }: PopoverProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <PopoverContext.Provider
      value={{ open: open ?? false, onOpenChange, triggerRef }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({
  children,
  className,
  asChild,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, onOpenChange, triggerRef } = React.useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      {
        onClick: () => onOpenChange?.(!open),
      },
    );
  }

  return (
    <button
      ref={triggerRef}
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
  side = "bottom",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
}) {
  const { open, onOpenChange, triggerRef } = React.useContext(PopoverContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const width = contentRef.current?.offsetWidth ?? 288;

    let left = rect.left;
    if (align === "center") {
      left = rect.left + rect.width / 2 - width / 2;
    } else if (align === "end") {
      left = rect.right - width;
    }

    const maxLeft = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    if (side === "top") {
      setStyle({
        position: "fixed",
        left: maxLeft,
        top: rect.top - gap,
        transform: "translateY(-100%)",
        zIndex: 50,
        width,
      });
    } else {
      setStyle({
        position: "fixed",
        left: maxLeft,
        top: rect.bottom + gap,
        zIndex: 50,
        width,
      });
    }
  }, [align, side, triggerRef]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onOpenChange?.(false);
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange?.(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onOpenChange, triggerRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={contentRef}
      data-slot="popover-content"
      style={style}
      className={cn(
        "rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg shadow-primary/10 animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

export { Popover, PopoverTrigger, PopoverContent };
