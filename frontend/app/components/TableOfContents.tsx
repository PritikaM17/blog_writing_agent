"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import type { TocHeading } from "@/lib/ui";
import { cn } from "@/lib/ui";

/** The last heading scrolled past the top third of the viewport is "active". */
function useActiveHeading(headings: TocHeading[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const update = () => {
      const line = Math.min(window.innerHeight * 0.33, 240);
      let current: string | null = null;
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
        else break;
      }
      setActive(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [headings]);

  return active;
}

function TocList({
  headings,
  active,
  onNavigate,
}: {
  headings: TocHeading[];
  active: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ol className="space-y-0.5 border-l border-border">
      {headings.map((h) => {
        const isActive = active === h.id;
        return (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={onNavigate}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-1.5 text-[13px] leading-snug transition-colors duration-200",
                h.level === 3 ? "pl-7" : "pl-4",
                isActive
                  ? "border-accent font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:border-input hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/** Sticky sidebar on ≥ lg. */
export function TocSidebar({ headings }: { headings: TocHeading[] }) {
  const active = useActiveHeading(headings);
  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ListTree aria-hidden className="size-3.5" />
        On this page
      </p>
      <TocList headings={headings} active={active} />
    </nav>
  );
}

/** Collapsible panel below the header on < lg. */
export function TocMobile({ headings }: { headings: TocHeading[] }) {
  const [open, setOpen] = useState(false);
  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="rounded-xl border border-border bg-card shadow-soft lg:hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="toc-mobile-list"
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <ListTree aria-hidden className="size-4 text-muted-foreground" />
          On this page
          <span className="font-mono text-xs text-muted-foreground">{headings.length}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div id="toc-mobile-list" hidden={!open} className="px-4 pb-4">
        <TocList headings={headings} active={null} onNavigate={() => setOpen(false)} />
      </div>
    </nav>
  );
}
