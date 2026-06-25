import { cn } from "@/lib/utils";

const ACCENT: Record<string, string> = {
  standard: "#8a6d3b",
  premium: "#7c3aed",
  default: "#c41e3a",
};

export function PackBox({
  code,
  name,
  className,
}: {
  code: string;
  name: string;
  className?: string;
}) {
  const accent = ACCENT[code] ?? ACCENT.default;

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[3/4] w-[120px] sm:w-[140px]",
        "transition-transform duration-250 hover:-translate-y-1",
        "[transform:perspective(400px)_rotateY(-8deg)_rotateX(4deg)]",
        "hover:[transform:perspective(400px)_rotateY(-2deg)_rotateX(2deg)_translateY(-4px)]",
        className,
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded border-2 border-[#8a6d3b] bg-gradient-to-br from-[#f5f0e6] to-[#ddd5c4]"
        style={{
          boxShadow:
            "4px 6px 0 #6b5428, inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <div
          className="px-2 py-1.5 text-center text-[9px] font-extrabold uppercase tracking-wider text-white"
          style={{ backgroundColor: accent }}
        >
          WC 2026
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-4 text-center">
          <span className="text-3xl" aria-hidden>
            📦
          </span>
          <p className="mt-2 line-clamp-2 text-[10px] font-bold leading-tight text-[#4a3820]">
            {name}
          </p>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded"
        style={{
          background:
            "linear-gradient(125deg, transparent 40%, rgba(255,255,255,0.35) 48%, transparent 56%)",
        }}
        aria-hidden
      />
    </div>
  );
}
