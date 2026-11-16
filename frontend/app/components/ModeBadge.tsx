import { BookOpen, Globe, Layers } from "lucide-react";
import { Badge, type BadgeTone } from "./ui/Badge";
import { modeLabel } from "@/lib/ui";

const config: Record<string, { tone: BadgeTone; Icon: typeof Globe; hint: string }> = {
  closed_book: { tone: "neutral", Icon: BookOpen, hint: "Written from model knowledge, no web research" },
  hybrid: { tone: "accent", Icon: Layers, hint: "Model knowledge plus targeted web research" },
  open_book: { tone: "success", Icon: Globe, hint: "Grounded in fresh web sources" },
};

export default function ModeBadge({ mode }: { mode: string }) {
  const { tone, Icon, hint } = config[mode] ?? config.closed_book;
  return (
    <Badge tone={tone} title={hint}>
      <Icon aria-hidden />
      {modeLabel(mode)}
    </Badge>
  );
}
