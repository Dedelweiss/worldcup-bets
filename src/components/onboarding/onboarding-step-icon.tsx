"use client";

import { motion } from "framer-motion";
import {
  getStepTheme,
  iconMotionVariants,
  type OnboardingStepTheme,
} from "@/lib/onboarding/step-themes";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

interface OnboardingStepIconProps {
  theme: OnboardingStepTheme;
  className?: string;
}

export function OnboardingStepIcon({ theme, className }: OnboardingStepIconProps) {
  const isClient = useIsClient();
  const Icon = theme.icon;

  const shellClass = cn(
    "relative flex size-14 items-center justify-center rounded-2xl ring-1 sm:size-16",
    theme.iconBg,
    className,
  );

  if (!isClient) {
    return (
      <div className={shellClass}>
        <Icon className={cn("relative size-7 sm:size-8", theme.accentClass)} />
      </div>
    );
  }

  return (
    <motion.div
      className={shellClass}
      initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-white/5"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div animate={iconMotionVariants[theme.iconMotion]}>
        <Icon className={cn("relative size-7 sm:size-8", theme.accentClass)} />
      </motion.div>
    </motion.div>
  );
}

interface OnboardingStepTitleProps {
  stepKey: string;
  title: string;
  subtitle?: string;
  accentLine?: string;
  index?: number;
}

export function OnboardingStepTitle({
  stepKey,
  title,
  subtitle,
  accentLine,
}: OnboardingStepTitleProps) {
  const isClient = useIsClient();
  const theme = getStepTheme(stepKey);

  if (!isClient) {
    return (
      <div className="mb-5 shrink-0">
        <OnboardingStepIcon theme={theme} className="mb-4" />
        <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {accentLine && (
          <p className={cn("mt-2 text-xs font-semibold", theme.accentClass)}>
            {accentLine}
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="mb-5 shrink-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
    >
      <OnboardingStepIcon theme={theme} className="mb-4" />
      <motion.h1
        className="text-xl font-bold leading-snug tracking-tight sm:text-2xl"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="mt-1.5 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.35 }}
        >
          {subtitle}
        </motion.p>
      )}
      {accentLine && (
        <motion.p
          className={cn("mt-2 text-xs font-semibold", theme.accentClass)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
        >
          {accentLine}
        </motion.p>
      )}
    </motion.div>
  );
}
