import { Check, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export type StepState = "pending" | "active" | "complete" | "failed" | "stopped";

export type TimelineStep = {
  key: string;
  title: string;
  detail?: ReactNode;
  state: StepState;
};

function StepIcon({ state }: { state: StepState }) {
  const base = "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-300";
  switch (state) {
    case "complete":
      return (
        <span className={cn(base, "border-accent bg-accent text-accent-foreground")}>
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        </span>
      );
    case "active":
      return (
        <span className={cn(base, "border-accent bg-card text-accent")}>
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-accent/20 motion-reduce:hidden" />
          <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "border-danger bg-danger-soft text-danger")}>
          <X aria-hidden className="size-3.5" strokeWidth={3} />
        </span>
      );
    case "stopped":
      return (
        <span className={cn(base, "border-border bg-muted text-muted-foreground")}>
          <X aria-hidden className="size-3" />
        </span>
      );
    default:
      return (
        <span className={cn(base, "border-border bg-card")}>
          <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/40" />
        </span>
      );
  }
}

const STATE_LABEL: Record<StepState, string> = {
  pending: "pending",
  active: "in progress",
  complete: "complete",
  failed: "failed",
  stopped: "cancelled",
};

export default function GenerationTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-3.5 top-7 bottom-0 w-px -translate-x-1/2 transition-colors duration-500",
                  step.state === "complete" ? "bg-accent/60" : "bg-border",
                )}
              />
            )}
            <StepIcon state={step.state} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium leading-6 transition-colors duration-200",
                  step.state === "pending" || step.state === "stopped"
                    ? "text-muted-foreground"
                    : step.state === "failed"
                      ? "text-danger"
                      : "text-foreground",
                )}
              >
                {step.title}
                <span className="sr-only"> — {STATE_LABEL[step.state]}</span>
              </p>
              {step.detail && (
                <div className="mt-1 animate-fade-up text-[13px] text-muted-foreground">
                  {step.detail}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
