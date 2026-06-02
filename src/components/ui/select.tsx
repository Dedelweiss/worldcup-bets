import * as React from "react";
import { cn } from "@/lib/utils";

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-transparent bg-[image:var(--select-chevron)] bg-[length:1rem] bg-[position:right_0.75rem_center] bg-no-repeat py-1 pl-2.5 pr-9 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
