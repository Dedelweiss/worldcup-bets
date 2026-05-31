import { FunBetsNotificationsShell } from "@/components/fun-bets/fun-bets-notifications-shell";
import { AppHeader } from "@/components/layout/app-header";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <FunBetsNotificationsShell>
        <div className="min-h-full bg-background">
          <AppHeader />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </div>
      </FunBetsNotificationsShell>
    </TooltipProvider>
  );
}
