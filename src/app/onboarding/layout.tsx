import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-zinc-950 text-foreground">
      <div className="flex shrink-0 justify-center pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold tracking-tight"
        >
          <SiteLogo size={28} className="size-7" />
          WC<span className="text-primary">2026</span> Pool
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
