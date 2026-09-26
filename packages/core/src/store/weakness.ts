import type { Tag } from "../content/types";

/** Weakness halves every 3 SRS days without new evidence. */
export const WEAK_HALF_LIFE_DAYS = 3;
/** Decayed score at which a tag counts as a weak spot. */
export const WEAK_THRESHOLD = 0.3;
export const WEAK_MAX_SCORE = 5;

export const WEAKNESS_WEIGHTS = {
  ideStruggle: 1,
  emphasize: 1,
  failedReview: 0.5,
} as const;

/** An effortless (❤️) review multiplies the card's tag weakness by this. */
export const EFFORTLESS_RELIEF = 0.5;

/** Cap on how much weak tags can multiply a due card's priority. */
const MAX_WEAK_BOOST = 3;

export function decayScore(score: number, lastFlaggedAt: number, now: number, dayMs: number): number {
  const elapsedDays = Math.max(0, now - lastFlaggedAt) / dayMs;
  return score * 0.5 ** (elapsedDays / WEAK_HALF_LIFE_DAYS);
}

/** Sum of the card's current tag weakness, capped. */
export function weakBoost(tags: readonly Tag[], weakScores: ReadonlyMap<Tag, number>): number {
  const total = tags.reduce((sum, tag) => sum + (weakScores.get(tag) ?? 0), 0);
  return Math.min(MAX_WEAK_BOOST, total);
}
