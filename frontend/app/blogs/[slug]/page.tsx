import { Suspense } from "react";
import BlogArticle, { BlogArticleSkeleton } from "@/app/components/BlogArticle";

// No generateStaticParams → params is runtime data and must be read inside Suspense
export default function BlogPage({ params }: PageProps<"/blogs/[slug]">) {
  return (
    <Suspense fallback={<BlogArticleSkeleton />}>
      {params.then(({ slug }) => (
        <BlogArticle slug={slug} />
      ))}
    </Suspense>
  );
}
