import Link from "next/link";
import { Trophy } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Trophy className="size-5" />
        </span>
        WC<span className="text-primary">2026</span> Pool
      </Link>
      {children}
    </div>
  );
}
