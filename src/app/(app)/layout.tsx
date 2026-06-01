import { FunBetsNotificationsShell } from "@/components/fun-bets/fun-bets-notifications-shell";
import { AppShell } from "@/components/layout/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <FunBetsNotificationsShell>
        <AppShell>{children}</AppShell>
      </FunBetsNotificationsShell>
    </TooltipProvider>
  );
}
