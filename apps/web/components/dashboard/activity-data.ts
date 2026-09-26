/**
 * Review activity per day, split by the surface the review happened on
 * (iMessage, web, IDE, voice). Pure and browser-safe: the
 * /api/dashboard-review/activity route buckets the store's review events with
 * it, and the client uses the types and series colours.
 */
import { localDayKey, shiftDayKey, dayKeyStart } from "@synapse/core/time";

export const ACTIVITY_SOURCES = ["imessage", "web", "ide", "voice"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

export interface ActivitySeriesMeta {
  key: ActivitySource;
  label: string;
  /** Mark colour (never used for text). */
  color: string;
  icon: string;
}

/**
 * Categorical slots 1-4 of the validated dataviz palette, dark-mode steps, in
 * fixed stacking order (bottom → top). Validated on the card surface #0f0f1c:
 * lightness band, chroma floor, adjacent CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.8,
 * contrast ≥ 4.9:1. Colour follows the source, never its rank.
 */
export const ACTIVITY_SERIES: readonly ActivitySeriesMeta[] = [
  { key: "imessage", label: "iMessage", color: "#3987e5", icon: "💬" },
  { key: "web", label: "Web", color: "#d95926", icon: "🖥️" },
  { key: "ide", label: "IDE", color: "#199e70", icon: "🧩" },
  { key: "voice", label: "Voice", color: "#c98500", icon: "🎙️" },
];

export function isActivitySource(value: unknown): value is ActivitySource {
  return typeof value === "string" && (ACTIVITY_SOURCES as readonly string[]).includes(value);
}

export type SourceCounts = Record<ActivitySource, number>;

export function emptySourceCounts(): SourceCounts {
  return { imessage: 0, web: 0, ide: 0, voice: 0 };
}

export interface ActivityBucket {
  /** Local day key ("2026-09-26"), or "srs-<offset>" at demo scale. */
  key: string;
  /** Short axis label: "Sep 26" / "Today" (or "-3d" at demo scale). */
  label: string;
  /** Tooltip / table label: "Sat, Sep 26". */
  fullLabel: string;
  startsAt: number;
  endsAt: number;
  reviews: number;
  passed: number;
  bySource: SourceCounts;
}

export interface ActivityTotals {
  reviews: number;
  passed: number;
  bySource: SourceCounts;
}

/** GET /api/dashboard-review/activity */
export interface ReviewActivityResponse {
  buckets: ActivityBucket[];
  totals: ActivityTotals;
  /** Buckets are SRS days (dayMs windows ending now) instead of local calendar days. */
  demoScale: boolean;
  dayMs: number;
  timezone: string;
}

/** The subset of a store ActivityEvent this module reads. */
export interface ActivityEventLike {
  kind: string;
  detail: Record<string, unknown> | null;
  createdAt: number;
}

export interface BucketOptions {
  now: number;
  timeZone: string;
  dayMs: number;
  /** SRS-day buckets (dayMs windows) instead of local calendar days. */
  demoScale: boolean;
  /** Number of buckets, oldest first; the last one is "today". Default 30. */
  days?: number;
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

function dayKeyDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/** "2026-09-26" → "Sep 26" (or "Sat, Sep 26" with the weekday). */
export function formatDayKey(dayKey: string, withWeekday = false): string {
  return (withWeekday ? WEEKDAY_MONTH_DAY : MONTH_DAY).format(dayKeyDate(dayKey));
}

function newBucket(key: string, label: string, fullLabel: string, startsAt: number, endsAt: number): ActivityBucket {
  return { key, label, fullLabel, startsAt, endsAt, reviews: 0, passed: 0, bySource: emptySourceCounts() };
}

/** Empty buckets covering the window, oldest first. */
export function activityBuckets(options: BucketOptions): ActivityBucket[] {
  const days = Math.max(1, Math.floor(options.days ?? 30));
  const { now, timeZone, dayMs } = options;
  if (options.demoScale) {
    return Array.from({ length: days }, (_, index) => {
      const offset = days - 1 - index;
      const endsAt = now - offset * dayMs;
      const label = offset === 0 ? "Today" : `-${offset}d`;
      const fullLabel = offset === 0 ? "Today (current SRS day)" : `${offset} SRS day${offset === 1 ? "" : "s"} ago`;
      return newBucket(`srs-${offset}`, label, fullLabel, endsAt - dayMs, endsAt);
    });
  }
  const today = localDayKey(now, timeZone);
  return Array.from({ length: days }, (_, index) => {
    const offset = days - 1 - index;
    const key = shiftDayKey(today, -offset);
    const startsAt = dayKeyStart(key, timeZone);
    const endsAt = offset === 0 ? now : dayKeyStart(shiftDayKey(key, 1), timeZone);
    return newBucket(key, offset === 0 ? "Today" : formatDayKey(key), formatDayKey(key, true), startsAt, endsAt);
  });
}

/**
 * Buckets "review" events (logged by the store on every graded card, with
 * detail.source and detail.grade) into per-day counts by source. Events in the
 * future or outside the window are ignored; unknown sources still count toward
 * the day's total.
 */
export function bucketReviewActivity(events: readonly ActivityEventLike[], options: BucketOptions): ActivityBucket[] {
  const buckets = activityBuckets(options);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const first = buckets[0]!;
  for (const event of events) {
    if (event.kind !== "review" || event.createdAt > options.now) continue;
    let bucket: ActivityBucket | undefined;
    if (options.demoScale) {
      if (event.createdAt <= first.startsAt) continue;
      const offset = Math.floor((options.now - event.createdAt) / options.dayMs);
      bucket = byKey.get(`srs-${offset}`);
    } else {
      bucket = byKey.get(localDayKey(event.createdAt, options.timeZone));
    }
    if (!bucket) continue;
    bucket.reviews += 1;
    const grade = event.detail?.grade;
    if (typeof grade === "number" && grade >= 3) bucket.passed += 1;
    const source = event.detail?.source;
    if (isActivitySource(source)) bucket.bySource[source] += 1;
  }
  return buckets;
}

export function activityTotals(buckets: readonly ActivityBucket[]): ActivityTotals {
  const totals: ActivityTotals = { reviews: 0, passed: 0, bySource: emptySourceCounts() };
  for (const bucket of buckets) {
    totals.reviews += bucket.reviews;
    totals.passed += bucket.passed;
    for (const source of ACTIVITY_SOURCES) totals.bySource[source] += bucket.bySource[source];
  }
  return totals;
}
