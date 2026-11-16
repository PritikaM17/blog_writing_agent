import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
}
