"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";
import type { OnboardingChoiceOption } from "@/lib/onboarding/types";

interface OnboardingChoiceCardsProps {
  options: OnboardingChoiceOption[];
  value: string | null;
  onChange: (choiceId: string) => void;
  disabled?: boolean;
  accentClass?: string;
}

function choiceClass(selected: boolean, disabled?: boolean) {
  return cn(
    "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left backdrop-blur-sm transition-colors",
    "hover:border-white/20 hover:bg-white/5 active:scale-[0.99]",
    selected
      ? "border-white/30 bg-white/10 ring-2 ring-white/15"
      : "border-border/50 bg-card/30",
    disabled && "pointer-events-none opacity-60",
  );
}

export function OnboardingChoiceCards({
  options,
  value,
  onChange,
  disabled,
  accentClass = "text-primary",
}: OnboardingChoiceCardsProps) {
  const isClient = useIsClient();

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      {options.map((option, i) => {
        const selected = value === option.id;
        const body = (
          <>
            <div>
              <p className="font-semibold">{option.label}</p>
              {option.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
            {selected && (
              <Check className={cn("size-5 shrink-0", accentClass)} aria-hidden />
            )}
          </>
        );

        if (!isClient) {
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={choiceClass(selected, disabled)}
            >
              {body}
            </button>
          );
        }

        return (
          <motion.button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.08, duration: 0.35 }}
            whileTap={{ scale: 0.98 }}
            className={choiceClass(selected, disabled)}
          >
            {body}
          </motion.button>
        );
      })}
    </div>
  );
}
