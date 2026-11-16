"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";

/** Sticky translucent header; hairline border fades in once the page scrolls. */
export default function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl backdrop-saturate-150 transition-[border-color,background-color] duration-200",
        scrolled
          ? "border-border bg-background/80"
          : "border-transparent bg-background/60",
      )}
    >
      {children}
    </header>
  );
}
