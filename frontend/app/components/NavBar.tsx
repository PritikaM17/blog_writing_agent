import Link from "next/link";
import { Suspense } from "react";
import { Feather } from "lucide-react";
import HeaderShell from "./HeaderShell";
import NavLinks, { MobileNav } from "./NavLinks";
import ThemeToggle from "./ThemeToggle";

export function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-lg text-[15px] font-semibold tracking-tight"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background shadow-soft transition-transform duration-200 group-hover:-rotate-6">
        <Feather aria-hidden className="size-4" />
      </span>
      <span>
        Blog <span className="text-muted-foreground">Agent</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  return (
    <HeaderShell>
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
        <Logo />

        <div className="flex items-center gap-1">
          {/* usePathname needs Suspense under cacheComponents (dynamic /blogs/[slug]) */}
          <Suspense fallback={<div className="hidden h-8 w-64 md:block" />}>
            <NavLinks />
          </Suspense>
          <ThemeToggle />
          <Suspense fallback={<div className="size-9 md:hidden" />}>
            <MobileNav />
          </Suspense>
        </div>
      </div>
    </HeaderShell>
  );
}
