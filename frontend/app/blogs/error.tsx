"use client";

import { useEffect } from "react";
import { RotateCcw, ServerCrash } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Container } from "@/app/components/ui/Container";

// Next 16: error boundaries receive `retry` (not `reset`), and `error` is `unknown`
export default function BlogsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof Error ? error.message : null;

  return (
    <Container size="sm" className="py-20">
      <div
        role="alert"
        className="flex flex-col items-center rounded-3xl border border-danger/25 bg-danger-soft px-6 py-14 text-center"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-card text-danger shadow-soft">
          <ServerCrash aria-hidden className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Couldn&apos;t load blogs</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Is the FastAPI server running on port 8000?
        </p>
        {message && (
          <p className="mt-3 max-w-md break-words rounded-md bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
            {message}
          </p>
        )}
        <Button variant="secondary" className="mt-6" onClick={() => retry()}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
      </div>
    </Container>
  );
}
