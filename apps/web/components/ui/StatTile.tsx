import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatTone = "violet" | "cyan" | "success" | "warning" | "danger" | "neutral";

const VALUE_TONES: Record<StatTone, string> = {
  violet: "text-synapse-soft",
  cyan: "text-axon-soft",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-fg",
};

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Secondary line under the value ("12 reviewed today"). */
  hint?: ReactNode;
  /** Emoji or icon shown top-right. */
  icon?: ReactNode;
  tone?: StatTone;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  className?: string;
}

const TREND = {
  up: { glyph: "▲", cls: "text-success" },
  down: { glyph: "▼", cls: "text-danger" },
  flat: { glyph: "■", cls: "text-fg-subtle" },
} as const;

/** KPI tile: label, big tabular number, optional hint and trend. */
export function StatTile({ label, value, hint, icon, tone = "neutral", trend, className }: StatTileProps) {
  return (
    <div className={cn("rounded-card border border-line bg-ink-850/85 p-4 shadow-card sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">{label}</p>
        {icon ? (
          <span aria-hidden="true" className="text-lg leading-none">
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight", VALUE_TONES[tone])}>
        {value}
      </p>
      {hint || trend ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
          {trend ? (
            <span className={cn("inline-flex items-center gap-1 font-medium", TREND[trend.direction].cls)}>
              <span aria-hidden="true" className="text-[0.6rem]">
                {TREND[trend.direction].glyph}
              </span>
              {trend.label}
            </span>
          ) : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}
