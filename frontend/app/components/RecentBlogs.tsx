import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listBlogs } from "@/lib/api";
import { formatDate } from "@/lib/format";
import BlogCard, { BlogCardSkeleton } from "./BlogCard";

function Header({ id }: { id?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-accent">Latest</p>
        <h2 id={id} className="mt-1 text-2xl font-semibold tracking-tight">Recently written</h2>
      </div>
      <Link
        href="/blogs"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        View all
        <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

/** Three most recent blogs. Renders nothing if the API is unreachable or empty. */
export default async function RecentBlogs() {
  let blogs;
  try {
    blogs = await listBlogs();
  } catch {
    return null;
  }
  if (blogs.length === 0) return null;

  const recent = [...blogs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  return (
    <section aria-labelledby="recent-heading">
      <Header id="recent-heading" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((blog) => (
          <li key={blog.slug}>
            <BlogCard blog={blog} date={formatDate(blog.created_at)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentBlogsSkeleton() {
  return (
    <section aria-hidden>
      <Header />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <BlogCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}
