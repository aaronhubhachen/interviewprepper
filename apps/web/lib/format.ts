/** Small, browser-safe display helpers shared by feature pages. */

/** 0.873 → "87%"; null → "—". */
export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Relative time from `now`: "just now", "in 3 min", "2 hr ago", "in 4 days". */
export function formatRelative(target: number, now: number = Date.now()): string {
  const delta = target - now;
  const abs = Math.abs(delta);
  if (abs < 45_000) return "just now";
  const units: Array<[number, string]> = [
    [86_400_000, "day"],
    [3_600_000, "hr"],
    [60_000, "min"],
  ];
  for (const [size, unit] of units) {
    if (abs >= size || unit === "min") {
      const value = Math.round(abs / size);
      const label = unit === "day" ? `${value} day${value === 1 ? "" : "s"}` : `${value} ${unit}`;
      return delta > 0 ? `in ${label}` : `${label} ago`;
    }
  }
  return "just now";
}

/** 83_000 → "1:23". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Pluralize: plural(3, "card") → "3 cards". */
export function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}
