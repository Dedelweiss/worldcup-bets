"use client";

import { useFunBetsUnreadCount } from "@/components/fun-bets/fun-bets-notifications-context";
import { cn } from "@/lib/utils";

export function NavFunBadge({ className }: { className?: string }) {
  const count = useFunBetsUnreadCount();
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 flex min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground",
        className,
      )}
      aria-label={`${count} nouveau${count > 1 ? "x" : ""} pari${count > 1 ? "s" : ""} fun`}
    >
      {label}
    </span>
  );
}
