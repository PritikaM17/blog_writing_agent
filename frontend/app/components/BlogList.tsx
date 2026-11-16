import { formatDate } from "@/lib/format";
import { listBlogs } from "@/lib/api";
import BlogBrowser from "./BlogBrowser";
import { BlogCardSkeleton } from "./BlogCard";
import EmptyState from "./EmptyState";
import { Skeleton } from "./ui/Skeleton";

export default async function BlogList() {
  const blogs = await listBlogs();

  if (blogs.length === 0) return <EmptyState />;

  // Format dates on the server so the client filter never re-formats them
  const items = blogs.map((blog) => ({ blog, date: formatDate(blog.created_at) }));

  return <BlogBrowser items={items} />;
}

/** Mirrors BlogBrowser's toolbar + grid exactly to avoid layout shift. */
export function BlogListSkeleton() {
  return (
    <div aria-busy aria-label="Loading blogs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-xs" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-4 w-28" />
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <BlogCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
