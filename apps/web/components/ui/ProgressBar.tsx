import { cn } from "@/lib/cn";

export type ProgressTone = "gradient" | "violet" | "cyan" | "success" | "warning" | "danger";

const FILLS: Record<ProgressTone, string> = {
  gradient: "bg-[linear-gradient(90deg,var(--color-synapse),var(--color-axon))]",
  violet: "bg-synapse",
  cyan: "bg-axon",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export interface ProgressBarProps {
  /** Current value; clamped to [0, max]. */
  value: number;
  /** Default 1 (so value is a ratio). Use 100 for percentages. */
  max?: number;
  /** Accessible name; also the visible label when showLabel is set. */
  label: string;
  /** Visible label row above the bar (label left, value right). */
  showLabel?: boolean;
  /** Custom text for the value (default: rounded percent). */
  valueText?: string;
  tone?: ProgressTone;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function ProgressBar({
  value,
  max = 1,
  label,
  showLabel = false,
  valueText,
  tone = "gradient",
  size = "sm",
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  const text = valueText ?? `${percent}%`;
  return (
    <div className={cn("w-full", className)}>
      {showLabel ? (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-fg-muted">{label}</span>
          <span className="tabular-nums text-fg-subtle">{text}</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-valuetext={text}
        className={cn(
          "w-full overflow-hidden rounded-full bg-ink-700",
          size === "xs" ? "h-1" : size === "sm" ? "h-2" : "h-3",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", FILLS[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
