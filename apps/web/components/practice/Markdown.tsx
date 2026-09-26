import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { parseInline, parseMarkdown, type Block, type Inline, type InlineOptions } from "./markdown-parser";

function renderInline(nodes: Inline[], keyPrefix = "i"): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.text}</Fragment>;
      case "code":
        return <code key={key}>{node.text}</code>;
      case "strong":
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case "em":
        return (
          <em key={key} className="italic text-fg">
            {renderInline(node.children, key)}
          </em>
        );
      case "sup":
        return (
          <Fragment key={key}>
            {node.base}
            <sup className="text-[0.7em]">{node.exponent}</sup>
          </Fragment>
        );
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-axon underline decoration-axon/40 underline-offset-2 hover:decoration-axon"
          >
            {renderInline(node.children, key)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
    }
  });
}

function renderBlock(block: Block, index: number, headingOffset: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const level = Math.min(6, block.level + headingOffset) as 2 | 3 | 4 | 5 | 6;
      const Heading = `h${level}` as "h3";
      return (
        <Heading key={index} className="mt-5 text-base font-semibold text-fg first:mt-0">
          {renderInline(block.children)}
        </Heading>
      );
    }
    case "paragraph":
      return <p key={index}>{renderInline(block.children)}</p>;
    case "list": {
      const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `li-${itemIndex}`)}</li>);
      return block.ordered ? (
        <ol key={index} start={block.start === 1 ? undefined : block.start}>
          {items}
        </ol>
      ) : (
        <ul key={index}>{items}</ul>
      );
    }
    case "code":
      return (
        <pre
          key={index}
          className="scrollbar-thin overflow-x-auto rounded-xl border border-line bg-ink-900 p-3 font-mono text-[0.8125rem] leading-relaxed text-fg"
        >
          {/* Utilities (cascade layer) override prose-synapse's inline-code chip styles. */}
          <code className="rounded-none border-0 bg-transparent p-0 text-[1em] text-inherit">{block.text}</code>
        </pre>
      );
  }
}

/** Safe Markdown subset (see markdown.ts). `headingOffset` shifts "#" so it nests under the page's h1/h2. */
export function Markdown({ source, className, headingOffset = 2 }: { source: string; className?: string; headingOffset?: number }) {
  const blocks = parseMarkdown(source);
  return <div className={cn("prose-synapse text-[0.9375rem]", className)}>{blocks.map((block, i) => renderBlock(block, i, headingOffset))}</div>;
}

/** Inline-only rendering (constraints, example notes). */
export function InlineMarkdown({ text, options }: { text: string; options?: InlineOptions }) {
  return <>{renderInline(parseInline(text, options))}</>;
}
