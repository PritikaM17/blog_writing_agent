import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUp, Clock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { extractHeadings, readingTime } from "@/lib/ui";
import { getBlog } from "@/lib/api";
import CopyMarkdownButton from "./CopyMarkdownButton";
import Markdown from "./Markdown";
import ModeBadge from "./ModeBadge";
import ReadingProgress from "./ReadingProgress";
import Sources from "./Sources";
import { TocMobile, TocSidebar } from "./TableOfContents";
import { Container } from "./ui/Container";
import { Skeleton } from "./ui/Skeleton";

export default async function BlogArticle({ slug }: { slug: string }) {
  const blog = await getBlog(slug);

  if (!blog) notFound();

  // Markdown starts with "# Title" — the header below already shows it
  const body = blog.markdown.replace(/^#\s+.*\n+/, "");
  const headings = extractHeadings(body);
  const { minutes, words } = readingTime(body);

  return (
    <>
      <ReadingProgress />
      <Container className="py-10 sm:py-14">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16">
          <article id="top" className="min-w-0">
            <header className="max-w-[70ch] animate-fade-up">
              <Link
                href="/blogs"
                className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft aria-hidden className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                All blogs
              </Link>

              <h1 className="mt-6 text-3xl font-semibold leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.75rem]">
                {blog.title}
              </h1>

              <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
                {blog.topic}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                  <ModeBadge mode={blog.mode} />
                  <time dateTime={blog.created_at}>{formatDate(blog.created_at)}</time>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5" title={`${words.toLocaleString("en-US")} words`}>
                    <Clock aria-hidden className="size-3.5" />
                    {minutes} min read
                  </span>
                </div>
                <CopyMarkdownButton markdown={blog.markdown} />
              </div>
            </header>

            <div className="mt-8 max-w-[70ch]">
              <TocMobile headings={headings} />
            </div>

            <div className="mt-10">
              <Markdown content={body} headings={headings} />
            </div>

            <div className="mt-16 max-w-[70ch] space-y-10">
              <Sources evidence={blog.evidence} />

              <div className="flex items-center justify-between border-t border-border pt-6 text-sm">
                <Link
                  href="/blogs"
                  className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                  All blogs
                </Link>
                <a
                  href="#top"
                  className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to top
                  <ArrowUp aria-hidden className="size-4" />
                </a>
              </div>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-6">
              <TocSidebar headings={headings} />
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}

/** Mirrors BlogArticle's layout to avoid layout shift. */
export function BlogArticleSkeleton() {
  return (
    <Container className="py-10 sm:py-14" aria-busy aria-label="Loading blog">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16">
        <div className="min-w-0">
          <div className="max-w-[70ch]">
            <Skeleton className="h-5 w-24" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-9 w-full sm:h-11" />
              <Skeleton className="h-9 w-2/3 sm:h-11" />
            </div>
            <Skeleton className="mt-5 h-5 w-4/5" />
            <div className="mt-6 flex items-center justify-between border-y border-border py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-8 w-36 rounded-lg" />
            </div>
            <Skeleton className="mt-8 h-12 w-full rounded-xl lg:hidden" />
          </div>
          <div className="mt-10 max-w-[70ch] space-y-3">
            <Skeleton className="mb-6 h-7 w-1/2" />
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className={i % 4 === 3 ? "h-4 w-3/5" : "h-4 w-full"} />
            ))}
          </div>
          <Skeleton className="mt-8 aspect-video w-full max-w-[70ch] rounded-2xl" />
        </div>
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-full" />
          ))}
        </div>
      </div>
    </Container>
  );
}
