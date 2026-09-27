import { isWithinActiveHours, type ActiveHours } from "@synapse/core";

/** Every real UTC offset is a multiple of 15 minutes, so local hours start on 15-minute UTC boundaries. */
const CHUNK_MS = 15 * 60_000;
/** Walks at most two weeks; callers treat anything older as stale anyway. */
const MAX_CHUNKS = (14 * 24 * 60) / 15 + 2;

/**
 * Milliseconds of [from, to) that fall inside the local active-hours window,
 * stopping once `limitMs` is reached. Used so a probe texted at 21:30 does not
 * quietly expire overnight while the user sleeps.
 */
export function activeMsBetween(
  from: number,
  to: number,
  timeZone: string,
  hours: ActiveHours,
  limitMs = Number.POSITIVE_INFINITY,
): number {
  let total = 0;
  let cursor = from;
  for (let chunks = 0; cursor < to && total < limitMs && chunks < MAX_CHUNKS; chunks++) {
    const boundary = Math.min(to, (Math.floor(cursor / CHUNK_MS) + 1) * CHUNK_MS);
    if (isWithinActiveHours(cursor, timeZone, hours)) total += boundary - cursor;
    cursor = boundary;
  }
  return total;
}
