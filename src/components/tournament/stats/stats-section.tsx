import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: "amber" | "violet" | "emerald" | "sky" | "rose";
  children: ReactNode;
  className?: string;
}

const accentStyles = {
  amber: {
    ring: "ring-amber-500/20",
    icon: "bg-amber-500/15 text-amber-400",
    glow: "from-amber-500/10",
  },
  violet: {
    ring: "ring-violet-500/20",
    icon: "bg-violet-500/15 text-violet-400",
    glow: "from-violet-500/10",
  },
  emerald: {
    ring: "ring-emerald-500/20",
    icon: "bg-emerald-500/15 text-emerald-400",
    glow: "from-emerald-500/10",
  },
  sky: {
    ring: "ring-sky-500/20",
    icon: "bg-sky-500/15 text-sky-400",
    glow: "from-sky-500/10",
  },
  rose: {
    ring: "ring-rose-500/20",
    icon: "bg-rose-500/15 text-rose-400",
    glow: "from-rose-500/10",
  },
};

export function StatsSection({
  icon: Icon,
  title,
  description,
  accent = "amber",
  children,
  className,
}: StatsSectionProps) {
  const styles = accentStyles[accent];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-5 shadow-xl shadow-black/20 sm:p-6",
        "ring-1 ring-inset",
        styles.ring,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent opacity-60",
          styles.glow,
        )}
        aria-hidden
      />
      <header className="relative mb-5 flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            styles.icon,
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="relative">{children}</div>
    </section>
  );
}
