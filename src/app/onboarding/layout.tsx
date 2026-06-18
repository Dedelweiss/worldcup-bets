import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="relative flex min-h-[100dvh] flex-col">
        <div className="flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold tracking-tight"
          >
            <SiteLogo size={28} className="size-7" />
            WC<span className="text-primary">2026</span> Pool
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
