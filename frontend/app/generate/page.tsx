import type { Metadata } from "next";
import GenerateForm from "@/app/components/GenerateForm";
import { Container } from "@/app/components/ui/Container";

export const metadata: Metadata = {
  title: "New blog · Blog Writing Agent",
};

export default function GeneratePage() {
  return (
    <div className="relative isolate">
      <div aria-hidden className="bg-hero-glow absolute inset-x-0 top-0 -z-10 h-96 opacity-60" />
      <Container size="md" className="py-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Write a new blog</h1>
          <p className="mt-2 text-muted-foreground">
            Describe a topic. The agent routes, researches, plans and writes it —
            uses API credits for the LLM, web search and image generation.
          </p>
        </div>
        <div className="mt-8">
          <GenerateForm />
        </div>
      </Container>
    </div>
  );
}
