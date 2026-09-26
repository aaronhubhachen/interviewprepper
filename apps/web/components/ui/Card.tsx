import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends ComponentProps<"section"> {
  /** Rendered element (default "section"). */
  as?: "section" | "div" | "article" | "aside" | "li";
  /** Violet glow + gradient hairline border for the hero panel on a page. */
  glow?: boolean;
  /** Hover lift for clickable cards (wrap in a Link yourself). */
  interactive?: boolean;
  /** Default padding (p-5 sm:p-6). Set false to control padding yourself. */
  padded?: boolean;
}

export function Card({ as = "section", glow, interactive, padded = true, className, children, ...rest }: CardProps) {
  const Tag = as as "section";
  return (
    <Tag
      className={cn(
        "relative rounded-card shadow-card",
        glow ? "border-gradient shadow-glow" : "border border-line bg-ink-850/85",
        "backdrop-blur-sm",
        padded && "p-5 sm:p-6",
        interactive &&
          "transition-[border-color,transform,box-shadow] duration-200 hover:border-synapse/50 hover:shadow-glow motion-safe:hover:-translate-y-0.5",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions (buttons, links, pills). */
  actions?: ReactNode;
  /** Heading level for the title (default 2). */
  level?: 2 | 3 | 4;
  className?: string;
}

export function CardHeader({ title, eyebrow, description, actions, level = 2, className }: CardHeaderProps) {
  const Heading = `h${level}` as "h2";
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-synapse">{eyebrow}</p>
        ) : null}
        <Heading className="text-lg font-semibold text-fg">{title}</Heading>
        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
