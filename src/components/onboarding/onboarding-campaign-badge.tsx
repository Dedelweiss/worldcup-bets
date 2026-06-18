"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { PredictionCampaign } from "@/lib/onboarding/campaigns";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

interface OnboardingCampaignBadgeProps {
  campaign: PredictionCampaign;
  className?: string;
}

export function OnboardingCampaignBadge({
  campaign,
  className,
}: OnboardingCampaignBadgeProps) {
  const isClient = useIsClient();
  const classNames = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
    campaign.theme.badgeClass,
    className,
  );

  if (!isClient) {
    return (
      <span className={classNames}>
        <span aria-hidden>{campaign.emoji}</span>
        {campaign.shortLabel}
      </span>
    );
  }

  return (
    <motion.span
      className={classNames}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
    >
      <span aria-hidden>{campaign.emoji}</span>
      {campaign.shortLabel}
    </motion.span>
  );
}

interface OnboardingResumeBannerProps {
  campaign: PredictionCampaign;
  answeredCount: number;
  totalCount: number;
  isReturning: boolean;
  partialMode?: boolean;
  missingCount?: number;
}

export function OnboardingResumeBanner({
  campaign,
  answeredCount,
  totalCount,
  isReturning,
  partialMode = false,
  missingCount = 0,
}: OnboardingResumeBannerProps) {
  const isClient = useIsClient();

  if (!isReturning && answeredCount === 0) return null;

  let message: string;
  if (partialMode && missingCount > 0) {
    message =
      missingCount === 1
        ? `Une nouvelle question a été ajoutée au formulaire ${campaign.shortLabel}. Répondez-y pour continuer.`
        : `${missingCount} nouvelles questions ont été ajoutées au formulaire ${campaign.shortLabel}.`;
  } else if (answeredCount > 0) {
    const remaining = totalCount - answeredCount;
    message =
      remaining > 0
        ? `Reprise : ${answeredCount}/${totalCount} réponses — encore ${remaining} question${remaining > 1 ? "s" : ""} pour accéder au pool.`
        : `Vos pronostics ${campaign.shortLabel} sont complets — validez pour continuer.`;
  } else {
    message = `Complétez vos pronostics ${campaign.shortLabel} pour rejoindre le pool.`;
  }

  const classNames =
    "mx-auto mb-4 flex w-full max-w-lg items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-100/90";

  if (!isClient) {
    return (
      <div className={classNames} role="status">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <motion.div
      className={classNames}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      role="status"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
      <p>{message}</p>
    </motion.div>
  );
}
