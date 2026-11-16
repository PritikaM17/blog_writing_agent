import Link from "next/link";
import { Container } from "./ui/Container";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Blog Agent · researched, planned and written by a LangGraph pipeline.
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/blogs" className="transition-colors hover:text-foreground">
            Blogs
          </Link>
          <Link href="/generate" className="transition-colors hover:text-foreground">
            New blog
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
