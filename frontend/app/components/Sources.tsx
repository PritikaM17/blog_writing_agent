import { ExternalLink } from "lucide-react";
import type { Evidence } from "@/lib/types";
import { hostname } from "@/lib/ui";

export default function Sources({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="border-t border-border pt-10">
      <div className="flex items-baseline gap-2">
        <h2 id="sources-heading" className="text-xl font-semibold tracking-tight">
          Sources
        </h2>
        <span className="font-mono text-sm text-muted-foreground">{evidence.length}</span>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {evidence.map((e, i) => (
          <li key={`${i}-${e.url}`}>
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-[border-color,box-shadow] duration-200 hover:border-accent/40 hover:shadow-lift"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <span className="truncate">{hostname(e.url)}</span>
                  <ExternalLink
                    aria-hidden
                    className="size-3 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  />
                </span>
                <span className="mt-1 line-clamp-2 block text-sm font-medium leading-snug transition-colors group-hover:text-accent">
                  {e.title}
                </span>
                {(e.source || e.published_at) && (
                  <span className="mt-1.5 block text-xs text-muted-foreground">
                    {[e.source, e.published_at].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
