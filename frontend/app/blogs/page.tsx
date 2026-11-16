import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { PenLine } from "lucide-react";
import BlogList, { BlogListSkeleton } from "@/app/components/BlogList";
import { buttonVariants } from "@/app/components/ui/Button";
import { Container } from "@/app/components/ui/Container";

export const metadata: Metadata = {
  title: "Blogs · Blog Writing Agent",
};

export default function BlogsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Blogs</h1>
          <p className="mt-2 text-muted-foreground">
            Everything the agent has researched and written.
          </p>
        </div>
        <Link href="/generate" className={buttonVariants({ className: "self-start sm:self-auto" })}>
          <PenLine aria-hidden />
          New blog
        </Link>
      </div>

      <div className="mt-10">
        {/* Uncached fetch must be inside Suspense (cacheComponents) */}
        <Suspense fallback={<BlogListSkeleton />}>
          <BlogList />
        </Suspense>
      </div>
    </Container>
  );
}
