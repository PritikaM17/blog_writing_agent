import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogSummary } from "@/lib/types";
import ModeBadge from "./ModeBadge";
import { Skeleton } from "./ui/Skeleton";

/** Whole-card link. `date` is pre-formatted on the server to avoid locale/TZ mismatches. */
export default function BlogCard({ blog, date }: { blog: BlogSummary; date: string }) {
  return (
    <Link
      href={`/blogs/${blog.slug}`}
      className="group relative flex h-full min-h-44 flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-balance">
          {blog.title}
        </h3>
        <ArrowUpRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {blog.topic}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <ModeBadge mode={blog.mode} />
        <time dateTime={blog.created_at} className="font-mono text-xs text-muted-foreground">
          {date}
        </time>
      </div>
    </Link>
  );
}

export function BlogCardSkeleton() {
  return (
    <div className="flex h-full min-h-44 flex-col rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full space-y-2 py-0.5">
          <Skeleton className="h-4.5 w-11/12" />
          <Skeleton className="h-4.5 w-3/5" />
        </div>
        <Skeleton className="size-4 shrink-0" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-5">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    </div>
  );
}
