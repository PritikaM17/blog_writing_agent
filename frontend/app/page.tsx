import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import heroIllustration from "@/public/illustrations/hero.png";
import { ArrowRight, Globe, ImagePlus, LayoutList, Route, Sparkles } from "lucide-react";
import { buttonVariants } from "./components/ui/Button";
import { Container } from "./components/ui/Container";
import RecentBlogs, { RecentBlogsSkeleton } from "./components/RecentBlogs";

const STEPS = [
  {
    Icon: Route,
    title: "Route",
    body: "Decides whether the topic needs fresh research or can be written from knowledge.",
  },
  {
    Icon: Globe,
    title: "Research",
    body: "Searches the web and gathers sources to ground the facts and citations.",
  },
  {
    Icon: LayoutList,
    title: "Plan & write",
    body: "Outlines the post, then drafts every section in parallel.",
  },
  {
    Icon: ImagePlus,
    title: "Illustrate",
    body: "Generates images where they help and places them with captions.",
  },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="bg-hero-glow absolute inset-0 -z-10" />
        <div aria-hidden className="bg-hero-grid absolute inset-0 -z-10" />

        <Container className="grid items-center gap-8 pb-16 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-20">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
              <Sparkles aria-hidden className="size-3.5 text-accent" />
              Research · Plan · Write · Illustrate
            </span>

            <h1 className="mt-6 max-w-2xl animate-fade-up text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-6xl sm:leading-[1.05]">
              From a single topic to a{" "}
              <span className="text-accent">well-researched</span> blog post.
            </h1>

            <p className="mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Give the agent a topic. It researches, outlines, writes sections in
              parallel and adds images — while you watch it work.
            </p>

            <div className="mt-9 flex w-full animate-fade-up flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link href="/generate" className={buttonVariants({ size: "lg" })}>
                Write a blog
                <ArrowRight aria-hidden />
              </Link>
              <Link href="/blogs" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                Browse blogs
              </Link>
            </div>
          </div>

          <Image
            src={heroIllustration}
            alt=""
            preload
            sizes="(min-width: 1024px) 560px, (min-width: 640px) 80vw, 100vw"
            className="illustration mx-auto w-full max-w-xl animate-fade-up lg:max-w-none"
          />
        </Container>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="py-16">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-accent">How it works</p>
            <h2 id="how-heading" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              A small editorial team, in one pipeline
            </h2>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, title, body }, i) => (
              <li
                key={title}
                className="group relative rounded-2xl border border-border bg-card p-5 shadow-soft transition-[border-color,box-shadow] duration-200 hover:border-accent/30 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- Recent ---------- */}
      <Container className="py-8">
        {/* Uncached fetch must be inside Suspense (cacheComponents) */}
        <Suspense fallback={<RecentBlogsSkeleton />}>
          <RecentBlogs />
        </Suspense>
      </Container>
    </>
  );
}
