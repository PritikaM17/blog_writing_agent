import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

const widths = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
} as const;

export function Container({
  size = "lg",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: keyof typeof widths }) {
  return (
    <div
      className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", widths[size], className)}
      {...props}
    />
  );
}
