import { HelpGuide } from "@/components/help/help-guide";
import { CircleHelp } from "lucide-react";

export const metadata = { title: "Aide · WC2026 Pool" };

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CircleHelp className="size-7 text-primary" aria-hidden />
          Aide & règles
        </h1>
        <p className="mt-1 text-muted-foreground">
          Comment parier, gagner des points et utiliser l&apos;application entre
          amis.
        </p>
      </div>
      <HelpGuide />
    </div>
  );
}
