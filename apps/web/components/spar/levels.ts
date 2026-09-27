import type { PillTone } from "@/components/ui/Pill";
import type { Level } from "@/lib/voice/metrics";

/**
 * Chart colors use orange brand accents and neutral surfaces; text never uses chart fills.
 */
export const SERIES_PRIMARY = "var(--color-synapse-500)";
export const SERIES_COMPARE = "var(--color-axon-strong)";
/** Chart surface (card background) for the 2px rings/gaps around marks. */
export const CHART_SURFACE = "var(--color-ink-850)";
/** Hairline grid: one step off the surface. */
export const CHART_GRID = "var(--color-line)";
export const CHART_AXIS = "var(--color-line-strong)";

/** Meter fills carry severity: accent → warning → danger. */
export const LEVEL_FILL: Record<Level, string> = {
  idle: "var(--color-ink-600)",
  good: "var(--color-synapse-500)",
  warn: "var(--color-warning)",
  bad: "var(--color-danger)",
};

/** Status pills always pair color with an icon and a label. */
export const LEVEL_TONE: Record<Level, PillTone> = {
  idle: "neutral",
  good: "success",
  warn: "warning",
  bad: "danger",
};

export const LEVEL_ICON: Record<Level, string> = {
  idle: "•",
  good: "✓",
  warn: "!",
  bad: "✕",
};
