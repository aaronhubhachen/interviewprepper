import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { tagLabel } from "@synapse/core/content";
import { cn } from "@/lib/cn";

export type PillTone = "neutral" | "violet" | "cyan" | "success" | "warning" | "danger" | "love";

const TONES: Record<PillTone, string> = {
  neutral: "border-line-strong bg-ink-800 text-fg-muted",
  violet: "border-synapse/35 bg-synapse/10 text-synapse-soft",
  cyan: "border-axon/35 bg-axon/10 text-axon-soft",
  success: "border-success/35 bg-success/10 text-success",
  warning: "border-warning/35 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  love: "border-love/40 bg-love/10 text-love",
};

export interface PillProps extends ComponentProps<"span"> {
  tone?: PillTone;
  size?: "sm" | "md";
  icon?: ReactNode;
}

/** Small status/label chip. */
export function Pill({ tone = "neutral", size = "sm", icon, className, children, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface TagPillProps {
  /** Canonical tag id, e.g. "dp_state_compression" (label resolved with tagLabel from core). */
  tag: string;
  /** Currently weak for this user: warning tone plus a ‼️ marker. */
  weak?: boolean;
  /** Render as a link (e.g. "/review?tag=dp_state_compression" to drill this tag). */
  href?: string;
  size?: "sm" | "md";
  className?: string;
}

export function TagPill({ tag, weak, href, size = "sm", className }: TagPillProps) {
  const label = tagLabel(tag);
  const pill = (
    <Pill
      tone={weak ? "warning" : "violet"}
      size={size}
      icon={weak ? "‼️" : undefined}
      title={weak ? `${label} (weak spot)` : label}
      className={cn(href && "transition-colors hover:border-synapse hover:text-fg", className)}
    >
      {label}
      {weak ? <span className="sr-only"> (weak spot)</span> : null}
    </Pill>
  );
  return href ? (
    <Link href={href} className="inline-flex rounded-full">
      {pill}
    </Link>
  ) : (
    pill
  );
}
