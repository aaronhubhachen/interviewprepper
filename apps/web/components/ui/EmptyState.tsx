import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  /** Emoji or icon, shown large inside a glowing orb. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons / links. */
  action?: ReactNode;
  /** Heading level for the title (default 2). */
  level?: 1 | 2 | 3;
  className?: string;
}

export function EmptyState({ icon = "🧠", title, description, action, level = 2, className }: EmptyStateProps) {
  const Heading = `h${level}` as "h2";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-ink-900/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="relative mb-4 grid h-16 w-16 place-items-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-synapse/20 blur-xl motion-safe:animate-pulse-glow"
        />
        <span aria-hidden="true" className="relative text-3xl">
          {icon}
        </span>
      </div>
      <Heading className="text-lg font-semibold text-fg">{title}</Heading>
      {description ? <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  );
}
