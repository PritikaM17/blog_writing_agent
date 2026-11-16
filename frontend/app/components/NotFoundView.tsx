import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "./ui/Button";
import { Container } from "./ui/Container";

export default function NotFoundView({
  title,
  message,
  actions,
}: {
  title: string;
  message: string;
  actions: { href: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <Container size="sm" className="flex flex-col items-center py-24 text-center sm:py-32">
      <p
        aria-hidden
        className="select-none bg-linear-to-b from-muted-foreground/40 to-muted-foreground/5 bg-clip-text font-mono text-8xl font-semibold tracking-tighter text-transparent sm:text-9xl"
      >
        404
      </p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {actions.map((a, i) => (
          <Link
            key={a.href}
            href={a.href}
            className={buttonVariants({ variant: i === 0 ? "primary" : "secondary" })}
          >
            {a.icon}
            {a.label}
          </Link>
        ))}
      </div>
    </Container>
  );
}
