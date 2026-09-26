import { describe, expect, it } from "vitest";
import { zonedTimeToEpoch } from "@synapse/core/time";
import { activityBuckets, activityTotals, bucketReviewActivity, formatDayKey, type ActivityEventLike } from "./activity-data";

const CHI = "America/Chicago";
/** Saturday Sep 26 2026, 3:00 PM in Chicago. */
const NOW = zonedTimeToEpoch(CHI, 2026, 9, 26, 15);
const DAY = 86_400_000;

function review(createdAt: number, source: string, grade: number): ActivityEventLike {
  return { kind: "review", createdAt, detail: { cardId: "mc-x", grade, source, nextLabel: "1d" } };
}

describe("activityBuckets", () => {
  it("covers 30 local days ending today", () => {
    const buckets = activityBuckets({ now: NOW, timeZone: CHI, dayMs: DAY, demoScale: false });
    expect(buckets).toHaveLength(30);
    expect(buckets[29]!.key).toBe("2026-09-26");
    expect(buckets[29]!.label).toBe("Today");
    expect(buckets[29]!.fullLabel).toBe("Sat, Sep 26");
    expect(buckets[0]!.key).toBe("2026-08-28");
    expect(buckets[0]!.label).toBe("Aug 28");
    expect(buckets[29]!.endsAt).toBe(NOW);
  });

  it("uses dayMs windows ending now at demo scale", () => {
    const buckets = activityBuckets({ now: NOW, timeZone: CHI, dayMs: 60_000, demoScale: true, days: 5 });
    expect(buckets.map((bucket) => bucket.label)).toEqual(["-4d", "-3d", "-2d", "-1d", "Today"]);
    expect(buckets[4]!.endsAt).toBe(NOW);
    expect(buckets[4]!.startsAt).toBe(NOW - 60_000);
  });
});

describe("bucketReviewActivity", () => {
  it("counts reviews per local day and source, with passes", () => {
    const events: ActivityEventLike[] = [
      review(NOW - 60_000, "imessage", 5),
      review(NOW - 120_000, "web", 1),
      review(NOW - DAY, "ide", 3),
      review(NOW - 2 * DAY, "voice", 3),
      { kind: "push_probe", createdAt: NOW - 1000, detail: { cardId: "mc-x" } },
      review(NOW + 60_000, "web", 5), // future: ignored
      review(NOW - 40 * DAY, "web", 5), // outside the window
    ];
    const buckets = bucketReviewActivity(events, { now: NOW, timeZone: CHI, dayMs: DAY, demoScale: false });
    const today = buckets[29]!;
    expect(today.reviews).toBe(2);
    expect(today.passed).toBe(1);
    expect(today.bySource).toEqual({ imessage: 1, web: 1, ide: 0, voice: 0 });
    expect(buckets[28]!.bySource.ide).toBe(1);
    expect(buckets[27]!.bySource.voice).toBe(1);
    expect(activityTotals(buckets)).toEqual({ reviews: 4, passed: 3, bySource: { imessage: 1, web: 1, ide: 1, voice: 1 } });
  });

  it("buckets by local midnight, not UTC", () => {
    // 11:30 PM Chicago on Sep 25 is already Sep 26 in UTC.
    const lateNight = zonedTimeToEpoch(CHI, 2026, 9, 25, 23, 30);
    const buckets = bucketReviewActivity([review(lateNight, "web", 5)], {
      now: NOW,
      timeZone: CHI,
      dayMs: DAY,
      demoScale: false,
    });
    expect(buckets.find((bucket) => bucket.key === "2026-09-25")!.reviews).toBe(1);
    expect(buckets[29]!.reviews).toBe(0);
  });

  it("counts unknown sources toward the total only", () => {
    const buckets = bucketReviewActivity([review(NOW - 1000, "fax", 5)], {
      now: NOW,
      timeZone: CHI,
      dayMs: DAY,
      demoScale: false,
    });
    expect(buckets[29]!.reviews).toBe(1);
    expect(Object.values(buckets[29]!.bySource).every((count) => count === 0)).toBe(true);
  });

  it("buckets into SRS days at demo scale", () => {
    const events = [
      review(NOW, "web", 5),
      review(NOW - 59_999, "web", 5),
      review(NOW - 60_000, "imessage", 1),
      review(NOW - 10 * 60_000, "web", 3),
    ];
    const buckets = bucketReviewActivity(events, { now: NOW, timeZone: CHI, dayMs: 60_000, demoScale: true, days: 5 });
    expect(buckets[4]!.reviews).toBe(2);
    expect(buckets[3]!.bySource.imessage).toBe(1);
    expect(activityTotals(buckets).reviews).toBe(3); // the 10-minute-old one is outside 5 SRS days
  });
});

describe("formatDayKey", () => {
  it("formats day keys without timezone drift", () => {
    expect(formatDayKey("2026-01-01")).toBe("Jan 1");
    expect(formatDayKey("2026-09-26", true)).toBe("Sat, Sep 26");
  });
});
