"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FutStatInfoProps {
  label: string;
  description: string;
}

const triggerClassName = cn(
  "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full",
  "text-muted-foreground/80 transition-colors",
  "hover:text-lime-300 active:bg-white/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/80",
  "touch-manipulation",
);

function StatInfoContent({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <>
      <p className="font-semibold text-lime-300">{label}</p>
      <p className="mt-1 text-sm font-normal leading-snug text-zinc-300">
        {description}
      </p>
    </>
  );
}

function usePrefersFinePointerHover(): boolean {
  const [prefersHover, setPrefersHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setPrefersHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefersHover;
}

/** Infos stat FUT — tooltip au survol (desktop), popover au tap (mobile). */
export function FutStatInfo({ label, description }: FutStatInfoProps) {
  const prefersHover = usePrefersFinePointerHover();
  const [open, setOpen] = useState(false);

  if (prefersHover) {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={triggerClassName}
          aria-label={`${label} — en savoir plus`}
        >
          <Info className="size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[min(260px,calc(100vw-2rem))] border border-white/10 bg-zinc-900 p-3 text-left text-zinc-100 shadow-lg"
        >
          <StatInfoContent label={label} description={description} />
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={triggerClassName}
        aria-label={`${label} — en savoir plus`}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="max-w-[min(260px,calc(100vw-2rem))] border border-white/10 bg-zinc-900 p-3 text-left text-zinc-100 shadow-lg"
      >
        <StatInfoContent label={label} description={description} />
      </PopoverContent>
    </Popover>
  );
}
