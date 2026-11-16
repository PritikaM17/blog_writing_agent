"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "./ui/Button";

const ORDER = ["light", "dark", "system"] as const;
type ThemeChoice = (typeof ORDER)[number];

const META: Record<ThemeChoice, { Icon: typeof Sun; label: string }> = {
  light: { Icon: Sun, label: "Light" },
  dark: { Icon: Moon, label: "Dark" },
  system: { Icon: Monitor, label: "System" },
};

// true on the client after hydration, false during SSR — avoids a mismatch
const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const className = buttonVariants({ variant: "ghost", size: "icon" });

  if (!mounted) {
    // Same-size placeholder until the stored theme is known
    return <span className={className} aria-hidden />;
  }

  const current: ThemeChoice = ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const { Icon, label } = META[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={className}
      aria-label={`Theme: ${label}. Switch to ${META[next].label.toLowerCase()}`}
      title={`Theme: ${label}`}
    >
      <Icon aria-hidden key={current} className="animate-fade-up" />
    </button>
  );
}
