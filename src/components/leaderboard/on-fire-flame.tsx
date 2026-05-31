"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ON_FIRE_TOOLTIP } from "@/lib/on-fire";
import { cn } from "@/lib/utils";

interface OnFireFlameProps {
  className?: string;
}

export function OnFireFlame({ className }: OnFireFlameProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label="On Fire"
      >
        <motion.span
          className="inline-flex"
          animate={{
            scale: [1, 1.12, 1],
            rotate: [-4, 4, -4],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Flame className="size-4 fill-orange-500 text-orange-500" aria-hidden />
        </motion.span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-left">
        <p className="font-medium text-orange-600 dark:text-orange-400">
          On Fire
        </p>
        <p className="mt-0.5 text-background/80">{ON_FIRE_TOOLTIP}</p>
      </TooltipContent>
    </Tooltip>
  );
}
