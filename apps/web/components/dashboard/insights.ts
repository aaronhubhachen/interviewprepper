/**
 * Pure derivations for dashboard panels (weak spots, mastery ordering,
 * forecast summaries). Browser-safe; inputs are the /api/stats payload shapes.
 */

/** Mirrors core's WEAK_MAX_SCORE (weakness scores are capped at 5). */
export const WEAK_SCORE_MAX = 5;

/** Mirrors core's WEAK_THRESHOLD (a tag is "weak" at or above this score). */
export const WEAK_THRESHOLD = 0.3;

export type WeakSeverity = "high" | "medium" | "low";

export function weakSeverity(score: number): WeakSeverity {
  if (score >= 2.5) return "high";
  if (score >= 1) return "medium";
  return "low";
}

export const WEAK_SEVERITY_LABEL: Record<WeakSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Why a tag is weak, by the source that last flagged it. */
export const WEAK_WHY: Record<string, { icon: string; text: string }> = {
  ide: { icon: "🧩", text: "Struggled in the IDE" },
  tapback: { icon: "‼️", text: "Flagged with a ‼️ tapback" },
  review: { icon: "🔁", text: "Missed in a review" },
  manual: { icon: "✋", text: "Flagged manually" },
};

export function weakWhy(source: string): { icon: string; text: string } {
  return WEAK_WHY[source] ?? { icon: "⚠️", text: "Flagged as weak" };
}

export interface MasteryLike {
  tag: string;
  label: string;
  cards: number;
  learned: number;
  mastered: number;
  progress: number;
  weakScore: number;
}

/**
 * Patterns you have started come first (most progress first), then untouched
 * ones alphabetically, so the top of the list is where your memory lives.
 */
export function sortMastery<T extends MasteryLike>(list: readonly T[]): T[] {
  return [...list].sort(
    (a, b) => b.progress - a.progress || b.learned - a.learned || b.weakScore - a.weakScore || a.label.localeCompare(b.label),
  );
}

export interface ForecastLike {
  label: string;
  count: number;
}

export interface ForecastSummary {
  /** Cards due across the first `window` buckets (today included). */
  nextWeek: number;
  total: number;
  peak: { label: string; count: number } | null;
}

export function summarizeForecast(days: readonly ForecastLike[], window = 7): ForecastSummary {
  let peak: { label: string; count: number } | null = null;
  let total = 0;
  let nextWeek = 0;
  for (const [index, day] of days.entries()) {
    total += day.count;
    if (index < window) nextWeek += day.count;
    if (day.count > 0 && (peak === null || day.count > peak.count)) peak = { label: day.label, count: day.count };
  }
  return { nextWeek, total, peak };
}

/** Retention bands for the tile tone and its text hint (null = no reviews yet). */
export function retentionBand(ratio: number | null): "none" | "strong" | "ok" | "weak" {
  if (ratio === null) return "none";
  if (ratio >= 0.85) return "strong";
  if (ratio >= 0.7) return "ok";
  return "weak";
}
