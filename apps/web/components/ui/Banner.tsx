import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BannerTone = "info" | "success" | "warning" | "danger" | "synapse";

const TONES: Record<BannerTone, { box: string; icon: string; title: string }> = {
  info: { box: "border-info/35 bg-info/10", icon: "ℹ️", title: "text-info" },
  success: { box: "border-success/35 bg-success/10", icon: "✅", title: "text-success" },
  warning: { box: "border-warning/35 bg-warning/10", icon: "⚠️", title: "text-warning" },
  danger: { box: "border-danger/40 bg-danger/10", icon: "⛔", title: "text-danger" },
  synapse: { box: "border-synapse/40 bg-synapse/10", icon: "⚡", title: "text-synapse-soft" },
};

export interface BannerProps {
  tone?: BannerTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Override the leading emoji/icon (pass null to hide). */
  icon?: ReactNode;
  /** Buttons/links rendered at the end. */
  action?: ReactNode;
  /** Shows a close button (client components only). */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline, persistent message. Danger banners use role="alert"; others role="status".
 * Works in server components as long as onDismiss is not passed.
 */
export function Banner({ tone = "info", title, children, icon, action, onDismiss, className }: BannerProps) {
  const style = TONES[tone];
  const glyph = icon === undefined ? style.icon : icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", style.box, className)}
    >
      {glyph ? (
        <span aria-hidden="true" className="mt-px text-base leading-5">
          {glyph}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? <p className={cn("font-semibold", style.title)}>{title}</p> : null}
        {children ? <div className={cn("text-fg-muted", title ? "mt-0.5" : undefined)}>{children}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-ink-700 hover:text-fg"
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}
    </div>
  );
}
