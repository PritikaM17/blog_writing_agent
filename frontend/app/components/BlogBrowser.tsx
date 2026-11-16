"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import type { BlogSummary } from "@/lib/types";
import { cn, modeLabel } from "@/lib/ui";
import BlogCard from "./BlogCard";
import { Button } from "./ui/Button";

type Item = { blog: BlogSummary; date: string };

const MODE_ORDER = ["open_book", "hybrid", "closed_book"];

/** Purely presentational search + mode filter over the already-fetched list. */
export default function BlogBrowser({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const modes = useMemo(() => {
    const present = new Set(items.map((i) => i.blog.mode));
    return [
      ...MODE_ORDER.filter((m) => present.has(m)),
      ...[...present].filter((m) => !MODE_ORDER.includes(m)),
    ];
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter(({ blog }) => {
      if (mode && blog.mode !== mode) return false;
      if (!q) return true;
      return (
        blog.title.toLowerCase().includes(q) || blog.topic.toLowerCase().includes(q)
      );
    });
  }, [items, deferredQuery, mode]);

  const isFiltering = query.trim() !== "" || mode !== null;
  const chips: (string | null)[] = [null, ...modes];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="blog-search" className="sr-only">
            Search blogs
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or topic"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm shadow-soft outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-input focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Filter by mode" className="flex flex-wrap gap-2">
          {chips.map((m) => {
            const active = mode === m;
            return (
              <button
                key={m ?? "all"}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={active}
                className={cn(
                  "h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-200",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-input hover:text-foreground",
                )}
              >
                {m === null ? "All" : modeLabel(m)}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 h-4 text-sm leading-4 text-muted-foreground" aria-live="polite">
        {isFiltering
          ? `Showing ${filtered.length} of ${items.length}`
          : `${items.length} ${items.length === 1 ? "blog" : "blogs"}`}
      </p>

      {filtered.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ blog, date }) => (
            <li key={blog.slug} className="animate-fade-up">
              <BlogCard blog={blog} date={date} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-5" />
          </span>
          <p className="mt-4 font-medium">No blogs match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or mode.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-5"
            onClick={() => {
              setQuery("");
              setMode(null);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
