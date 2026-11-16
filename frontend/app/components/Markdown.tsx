import type { ReactNode } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageOff } from "lucide-react";
import { imageUrl } from "@/lib/api";
import { slugifyHeading, type TocHeading } from "@/lib/ui";

// The backend writes images as ![alt](images/foo.png) — relative to FastAPI,
// so rewrite them to point at the backend's /images mount.
function resolveImage(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  const filename = src.replace(/^\.?\/?images\//, "");
  return imageUrl(filename);
}

type HastNode = NonNullable<ExtraProps["node"]>;
type HastChild = HastNode["children"][number];

/** Plain text of a hast subtree. */
function textOf(node: HastChild | HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textOf).join("");
  return "";
}

function textOfChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOfChildren).join("");
  return "";
}

function isElement(child: HastChild, tag: string): child is Extract<HastChild, { type: "element" }> {
  return child.type === "element" && child.tagName === tag;
}

/** The backend replaces failed images with a blockquote of labelled lines. */
const FAILED_MARKER = "[IMAGE GENERATION FAILED]";

function FailedImageCallout({ node }: { node: HastNode }) {
  const paragraphs = node.children
    .filter((c) => isElement(c, "p"))
    .map((p) => textOf(p).trim());

  const caption = paragraphs[0]?.replace(FAILED_MARKER, "").trim();
  const field = (label: string) =>
    paragraphs
      .find((p) => p.startsWith(`${label}:`))
      ?.slice(label.length + 1)
      .trim();
  const details = [
    ["Alt text", field("Alt")],
    ["Prompt", field("Prompt")],
    ["Error", field("Error")],
  ].filter((d): d is [string, string] => Boolean(d[1]));

  return (
    <aside className="not-prose my-8 rounded-2xl border border-dashed border-border bg-muted/50 p-5 text-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-muted-foreground shadow-soft">
          <ImageOff aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">Image unavailable</p>
          {caption && <p className="mt-0.5 text-muted-foreground">{caption}</p>}
          {details.length > 0 && (
            <details className="group mt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                Show details
              </summary>
              <dl className="mt-2 space-y-2 text-xs">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-medium text-foreground">{label}</dt>
                    <dd className="mt-0.5 wrap-break-word font-mono leading-relaxed text-muted-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      </div>
    </aside>
  );
}

export default function Markdown({
  content,
  headings = [],
}: {
  content: string;
  /** From extractHeadings(content); ids are matched by source line. */
  headings?: TocHeading[];
}) {
  const idByLine = new Map(headings.map((h) => [h.line, h.id]));
  const headingId = (node: HastNode | undefined, children: ReactNode) =>
    (node?.position && idByLine.get(node.position.start.line)) ||
    slugifyHeading(textOfChildren(children));

  const components: Components = {
    h2: ({ node, children }) => <h2 id={headingId(node, children)}>{children}</h2>,
    h3: ({ node, children }) => <h3 id={headingId(node, children)}>{children}</h3>,

    img: ({ src, alt }) => {
      if (typeof src !== "string") return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveImage(src)} alt={alt ?? ""} loading="lazy" decoding="async" />
      );
    },

    // An image followed by an *italic* line becomes a captioned figure
    p: ({ node, children }) => {
      const kids = node?.children ?? [];
      const img = kids.find((c) => isElement(c, "img"));
      if (!img || img.type !== "element") return <p>{children}</p>;

      const rest = kids.filter((c) => c !== img && !(c.type === "text" && !c.value.trim()));
      const captionNode = rest.length === 1 && isElement(rest[0], "em") ? rest[0] : null;
      if (rest.length > 0 && !captionNode) return <p>{children}</p>;

      const src = img.properties.src;
      const alt = img.properties.alt;
      if (typeof src !== "string") return <p>{children}</p>;

      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImage(src)}
            alt={typeof alt === "string" ? alt : ""}
            loading="lazy"
            decoding="async"
          />
          {captionNode && <figcaption>{textOf(captionNode)}</figcaption>}
        </figure>
      );
    },

    blockquote: ({ node, children }) => {
      if (node && textOf(node).trim().startsWith(FAILED_MARKER)) {
        return <FailedImageCallout node={node} />;
      }
      return <blockquote>{children}</blockquote>;
    },

    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  };

  return (
    <div className="prose prose-blog dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
