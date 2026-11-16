"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  CircleAlert,
  ChevronDown,
  Clock,
  Info,
  PenLine,
  RotateCcw,
  Sparkles,
  Square,
  Timer,
} from "lucide-react";
import type { BlogDetail, StreamEvent } from "@/lib/types";
import { streamBlog } from "@/lib/api";
import { cn } from "@/lib/ui";
import GenerationTimeline, {
  type StepState,
  type TimelineStep,
} from "./GenerationTimeline";
import { Button, buttonVariants } from "./ui/Button";
import { Card } from "./ui/Card";

type Phase = "idle" | "running" | "done" | "error";
type Plan = { title: string; sections: string[] };

const EXAMPLES = [
  "How vector databases work",
  "A beginner's guide to LangGraph",
  "Rust vs Go for backend services",
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function GenerateForm() {
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Stop reading the stream if the user navigates away
  useEffect(() => () => controllerRef.current?.abort(), []);

  // ---- Presentational state (does not affect the stream) ----
  const formRef = useRef<HTMLFormElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Elapsed-time counter while running
  useEffect(() => {
    if (phase !== "running") return;
    const start = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [phase]);

  const running = phase === "running";
  const trimmed = topic.trim();
  const canSubmit = !running && trimmed.length >= 3 && trimmed.length <= 300;
  const percent = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  function addLog(message: string) {
    setLog((prev) => [...prev, message]);
  }

  function resetAll() {
    setPhase("idle");
    setLog([]);
    setPlan(null);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setBlog(null);
    setElapsed(0);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    resetAll();
    setPhase("running");

    const controller = new AbortController();
    controllerRef.current = controller;
    let finished = false;

    const onEvent = (ev: StreamEvent) => {
      switch (ev.event) {
        case "status":
          addLog(ev.data.message);
          break;
        case "plan":
          setPlan(ev.data);
          setProgress({ done: 0, total: ev.data.sections.length });
          addLog(`Planned ${ev.data.sections.length} sections`);
          break;
        case "section":
          setProgress(ev.data);
          break;
        case "done":
          finished = true;
          setBlog(ev.data);
          setPhase("done");
          addLog("Saved ✓");
          break;
        case "error":
          finished = true;
          setError(ev.data.detail);
          setPhase("error");
          break;
      }
    };

    try {
      await streamBlog(trimmed, onEvent, controller.signal);

      if (!finished) {
        setError("The stream ended before the blog was finished.");
        setPhase("error");
      }
    } catch (err) {
      if (controller.signal.aborted) {
        addLog("Cancelled.");
        setPhase("idle");
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    } finally {
      controllerRef.current = null;
    }
  }

  // ---- Derive timeline state from events already received ----
  const routerMsg = log.find((m) => m.startsWith("Mode:"));
  const researchMsg = log.find((m) => /^Found \d+ sources?/.test(m));
  const needsResearch = routerMsg?.includes("researching") ?? false;
  const cancelled = phase === "idle" && log.length > 0;
  const finishedOk = phase === "done";

  const complete = {
    start: log.length > 1 || plan !== null,
    research: plan !== null || (!!routerMsg && (!needsResearch || !!researchMsg)),
    plan: plan !== null,
    write:
      finishedOk ||
      (plan !== null && progress.total > 0 && progress.done >= progress.total),
    images: finishedOk,
    saved: finishedOk,
  };
  const order = ["start", "research", "plan", "write", "images", "saved"] as const;
  const current = order.find((k) => !complete[k]);

  function stateOf(key: (typeof order)[number]): StepState {
    if (complete[key]) return "complete";
    if (key !== current) return "pending";
    if (running) return "active";
    if (phase === "error") return "failed";
    if (cancelled) return "stopped";
    return "pending";
  }

  const steps: TimelineStep[] = [
    {
      key: "start",
      title: "Starting",
      state: stateOf("start"),
      detail: stateOf("start") === "active" ? "Connecting to the agent" : undefined,
    },
    {
      key: "research",
      title: needsResearch ? "Routing & research" : "Routing",
      state: stateOf("research"),
      detail:
        routerMsg || researchMsg ? (
          <span className="font-mono text-xs">
            {[routerMsg, researchMsg].filter(Boolean).join(" · ")}
          </span>
        ) : stateOf("research") === "active" ? (
          "Deciding whether the topic needs fresh research"
        ) : undefined,
    },
    {
      key: "plan",
      title: "Planning",
      state: stateOf("plan"),
      detail: plan
        ? `${plan.sections.length} sections outlined`
        : stateOf("plan") === "active"
          ? "Outlining the post"
          : undefined,
    },
    {
      key: "write",
      title: "Writing sections",
      state: stateOf("write"),
      detail:
        plan && progress.total > 0 ? (
          <div className="max-w-sm pt-1">
            <div className="flex items-center justify-between text-xs">
              <span>
                {progress.done} of {progress.total} written
                <span className="opacity-70"> · in parallel</span>
              </span>
              <span className="font-mono tabular-nums text-foreground">{percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Sections written"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : undefined,
    },
    {
      key: "images",
      title: "Adding images",
      state: stateOf("images"),
      detail:
        stateOf("images") === "active" ? "Generating and placing illustrations" : undefined,
    },
    { key: "saved", title: "Saved", state: stateOf("saved") },
  ].map((s) =>
    s.state === "stopped"
      ? { ...s, detail: "Cancelled" }
      : s.state === "failed"
        ? { ...s, detail: "Stopped here" }
        : s,
  );

  const activeStep = steps.find((s) => s.state === "active");
  const showProgress = running || log.length > 0;
  const tooShort = trimmed.length > 0 && trimmed.length < 3;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="space-y-6">
      {/* ---------- Form ---------- */}
      <Card className="overflow-hidden transition-shadow duration-200 focus-within:border-accent/40 focus-within:shadow-lift">
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="p-5 sm:p-6">
            <label htmlFor="topic" className="block text-sm font-medium">
              What should the blog be about?
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={running}
              rows={3}
              maxLength={300}
              placeholder="e.g. How vector databases work"
              aria-describedby="topic-hint topic-count"
              className="mt-3 w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground sm:text-xl"
            />

            {phase === "idle" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Try</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setTopic(ex)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:border-accent/40 hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span
                id="topic-count"
                className={cn("font-mono tabular-nums", tooShort && "text-warning")}
              >
                {trimmed.length}/300
              </span>
              <span id="topic-hint" className="inline-flex items-center gap-1.5">
                <Info aria-hidden className="size-3.5" />
                Takes a few minutes · uses API credits
              </span>
              <span className="hidden items-center gap-1 sm:inline-flex" aria-hidden>
                <kbd className="rounded border border-border bg-card px-1.5 py-px font-mono text-[11px]">
                  Ctrl/⌘
                </kbd>
                <kbd className="rounded border border-border bg-card px-1.5 py-px font-mono text-[11px]">
                  Enter
                </kbd>
              </span>
            </div>

            <div className="flex gap-2">
              {running && (
                <Button
                  variant="ghost"
                  onClick={() => controllerRef.current?.abort()}
                  className="flex-1 sm:flex-none"
                >
                  <Square aria-hidden className="size-3! fill-current" />
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={!canSubmit} className="flex-1 sm:flex-none">
                {running ? (
                  <>
                    <Sparkles aria-hidden className="animate-shimmer" />
                    Generating…
                  </>
                ) : (
                  <>
                    <PenLine aria-hidden />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* ---------- Error ---------- */}
      {phase === "error" && error && (
        <div
          role="alert"
          className="flex animate-fade-up flex-col gap-4 rounded-2xl border border-danger/30 bg-danger-soft p-5 sm:flex-row sm:items-start"
        >
          <CircleAlert aria-hidden className="size-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-danger">Generation failed</p>
            <p className="mt-1 break-words text-sm">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canSubmit}
            onClick={() => formRef.current?.requestSubmit()}
          >
            <RotateCcw aria-hidden />
            Try again
          </Button>
        </div>
      )}

      {/* ---------- Done ---------- */}
      {phase === "done" && blog && (
        <Card className="relative animate-fade-up overflow-hidden p-6 sm:p-8">
          <div aria-hidden className="bg-hero-glow pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success-soft text-success">
              <CircleCheck aria-hidden className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-success">Your blog is ready</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                {blog.title}
              </h2>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock aria-hidden className="size-3.5" />
                Finished in {formatDuration(elapsed)}
                {progress.total > 0 && ` · ${progress.total} sections`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/blogs/${blog.slug}`} className={buttonVariants()}>
                  Read blog
                  <ArrowRight aria-hidden />
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetAll();
                    setTopic("");
                  }}
                >
                  Write another
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ---------- Live progress ---------- */}
      {showProgress && (
        <div className="grid animate-fade-up gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card className="p-5 sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Progress</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 font-mono text-xs tabular-nums",
                  running ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Timer aria-hidden className="size-3.5" />
                <span className="sr-only">Elapsed time </span>
                {formatElapsed(elapsed)}
              </span>
            </div>

            <div aria-live="polite">
              <p className="sr-only">
                {activeStep
                  ? `${activeStep.title}${activeStep.key === "write" && progress.total > 0 ? `, ${progress.done} of ${progress.total} sections written` : ""}`
                  : finishedOk
                    ? "Blog saved"
                    : phase === "error"
                      ? "Generation failed"
                      : cancelled
                        ? "Cancelled"
                        : ""}
              </p>
              <GenerationTimeline steps={steps} />
            </div>

            {/* Raw status messages */}
            <div className="mt-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowDetails((s) => !s)}
                aria-expanded={showDetails}
                aria-controls="gen-log"
                className="flex w-full items-center justify-between rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Details
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 transition-transform duration-200", showDetails && "rotate-180")}
                />
              </button>
              <ul
                id="gen-log"
                hidden={!showDetails}
                className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-muted/60 p-3 font-mono text-xs text-muted-foreground"
              >
                {log.map((m, i) => (
                  <li key={i} className="break-words">
                    <span className="opacity-60">›</span> {m}
                  </li>
                ))}
                {running && (
                  <li className="animate-shimmer">
                    <span className="opacity-60">›</span> working…
                  </li>
                )}
              </ul>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold">Outline</h2>
            {plan ? (
              <div className="mt-4 animate-fade-up">
                <p className="text-lg font-semibold leading-snug tracking-tight text-balance">
                  {plan.title}
                </p>
                <ol className="mt-4 space-y-2.5">
                  {plan.sections.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="font-mono text-xs leading-6 text-muted-foreground tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {running
                    ? "The outline appears here once the plan is ready."
                    : "No outline was produced."}
                </p>
                {running &&
                  [80, 65, 72, 55].map((w, i) => (
                    <div key={i} aria-hidden className="flex items-center gap-3">
                      <span className="h-3 w-4 animate-shimmer rounded bg-muted" />
                      <span
                        className="h-3 animate-shimmer rounded bg-muted"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
