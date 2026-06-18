import { Sparkles } from "lucide-react";
import type { BracketProjectionMeta } from "@/lib/tournament/bracket-projection";

interface BracketProjectionNoticeProps {
  meta: BracketProjectionMeta;
}

export function BracketProjectionNotice({ meta }: BracketProjectionNoticeProps) {
  const thirdLabel =
    meta.advancingThirdGroups.length > 0
      ? meta.advancingThirdGroups.join(", ")
      : "—";

  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] border border-sky-500/25 bg-sky-500/[0.07] px-4 py-3">
      <Sparkles
        className="mt-0.5 size-4 shrink-0 text-sky-400"
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-sky-100">
          Prévision des 32es de finale
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Les équipes des 32es sont déduites du classement actuel des poules et
          de la table Annex C FIFA (8 meilleurs troisièmes : groupes{" "}
          <span className="font-medium text-foreground">{thirdLabel}</span>
          ). Les 16es restent vides tant que les 32es correspondantes ne sont
          pas terminées — seuls les vainqueurs réels y apparaissent ensuite.
        </p>
      </div>
    </div>
  );
}
