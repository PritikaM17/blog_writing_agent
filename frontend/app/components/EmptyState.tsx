import Image from "next/image";
import Link from "next/link";
import { PenLine } from "lucide-react";
import emptyIllustration from "@/public/illustrations/empty.png";
import { buttonVariants } from "./ui/Button";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
      <Image
        src={emptyIllustration}
        alt=""
        sizes="176px"
        className="illustration size-44"
      />
      <h2 className="mt-2 text-xl font-semibold tracking-tight">No blogs yet</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Pick a topic and the agent will research, plan and write your first post.
      </p>
      <Link href="/generate" className={buttonVariants({ className: "mt-7" })}>
        <PenLine aria-hidden />
        Write your first blog
      </Link>
    </div>
  );
}
