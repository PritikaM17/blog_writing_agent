import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  accent: "border-accent/20 bg-accent-soft text-accent-soft-foreground",
  success: "border-success/25 bg-success-soft text-success",
  danger: "border-danger/25 bg-danger-soft text-danger",
  warning: "border-warning/30 bg-warning-soft text-warning",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 [&_svg]:size-3",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
