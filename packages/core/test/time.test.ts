import { describe, expect, it } from "vitest";
import {
  computeStreak,
  dayKeyStart,
  describeLocalTime,
  humanizeDuration,
  isValidTimeZone,
  isWithinActiveHours,
  localDayKey,
  localHour,
  nextLocalTime,
  parseActiveHours,
  shiftDayKey,
  startOfLocalDay,
  zonedTimeToEpoch,
} from "../src/time";

const CHI = "America/Chicago";
const HOUR = 3_600_000;

describe("local calendar helpers", () => {
  it("computes local hour and day key in the target zone", () => {
    const lateEvening = Date.UTC(2026, 8, 27, 4, 30); // 23:30 CDT on Sep 26
    expect(localDayKey(lateEvening, CHI)).toBe("2026-09-26");
    expect(localDayKey(lateEvening, "UTC")).toBe("2026-09-27");
    expect(localHour(lateEvening, CHI)).toBe(23);
    expect(localHour(Date.UTC(2026, 8, 27, 5, 0), CHI)).toBe(0);
  });

  it("shifts day keys across month, year, and leap boundaries", () => {
    expect(shiftDayKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("converts wall-clock times to instants on both sides of DST", () => {
    expect(zonedTimeToEpoch(CHI, 2026, 1, 15, 9)).toBe(Date.UTC(2026, 0, 15, 15)); // CST
    expect(zonedTimeToEpoch(CHI, 2026, 7, 15, 9)).toBe(Date.UTC(2026, 6, 15, 14)); // CDT
  });

  it("handles 23- and 25-hour days at DST transitions", () => {
    expect(startOfLocalDay(Date.UTC(2026, 2, 8, 18), CHI)).toBe(Date.UTC(2026, 2, 8, 6));
    expect(dayKeyStart("2026-03-09", CHI) - dayKeyStart("2026-03-08", CHI)).toBe(23 * HOUR);
    expect(dayKeyStart("2026-11-02", CHI) - dayKeyStart("2026-11-01", CHI)).toBe(25 * HOUR);
  });

  it("resolves wall times inside a DST gap forward, in every hemisphere", () => {
    // Zones whose DST starts at midnight: the day starts at 01:00, never on the previous day.
    expect(localDayKey(dayKeyStart("2026-09-06", "America/Santiago"), "America/Santiago")).toBe("2026-09-06");
    expect(dayKeyStart("2026-09-06", "America/Santiago")).toBe(Date.UTC(2026, 8, 6, 4)); // 01:00 -03
    expect(localDayKey(dayKeyStart("2026-03-08", "America/Havana"), "America/Havana")).toBe("2026-03-08");
    expect(localDayKey(dayKeyStart("2026-10-04", "America/Asuncion"), "America/Asuncion")).toBe("2026-10-04");
    expect(zonedTimeToEpoch(CHI, 2027, 3, 14, 2, 30)).toBe(Date.UTC(2027, 2, 14, 8, 30)); // 03:30 CDT
    expect(zonedTimeToEpoch("Europe/London", 2026, 3, 29, 1)).toBe(Date.UTC(2026, 2, 29, 1)); // 02:00 BST
    expect(zonedTimeToEpoch("Australia/Sydney", 2026, 10, 4, 2, 30)).toBe(Date.UTC(2026, 9, 3, 16, 30)); // 03:30 AEDT
    // Ordinary and ambiguous (fall-back) times are unchanged.
    expect(zonedTimeToEpoch(CHI, 2026, 11, 1, 1, 30)).toBe(Date.UTC(2026, 10, 1, 6, 30)); // first 01:30 (CDT)
    expect(zonedTimeToEpoch("Asia/Kolkata", 2026, 9, 26)).toBe(Date.UTC(2026, 8, 25, 18, 30));
  });

  it("validates time zones", () => {
    expect(isValidTimeZone(CHI)).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});

describe("nextLocalTime", () => {
  it("finds tomorrow morning across the spring-forward transition", () => {
    const saturdayEvening = Date.UTC(2026, 2, 8, 2); // Sat Mar 7, 20:00 CST
    expect(nextLocalTime(saturdayEvening, CHI, 9)).toBe(Date.UTC(2026, 2, 8, 14)); // Sun 09:00 CDT
  });

  it("finds tomorrow morning across the fall-back transition", () => {
    const saturdayEvening = Date.UTC(2026, 10, 1, 1); // Sat Oct 31, 20:00 CDT
    expect(nextLocalTime(saturdayEvening, CHI, 9)).toBe(Date.UTC(2026, 10, 1, 15)); // Sun 09:00 CST
  });

  it("never returns an hour that the spring-forward gap skipped as an earlier time", () => {
    const saturdayNoon = zonedTimeToEpoch(CHI, 2027, 3, 13, 12);
    expect(nextLocalTime(saturdayNoon, CHI, 2)).toBe(Date.UTC(2027, 2, 14, 8)); // Sun 03:00 CDT, not 01:00
  });

  it("returns later today when the hour has not passed, else tomorrow", () => {
    const early = Date.UTC(2026, 8, 26, 13, 59); // 08:59 CDT
    expect(nextLocalTime(early, CHI, 9)).toBe(Date.UTC(2026, 8, 26, 14));
    const exactlyNine = Date.UTC(2026, 8, 26, 14);
    expect(nextLocalTime(exactlyNine, CHI, 9)).toBe(Date.UTC(2026, 8, 27, 14));
  });
});

describe("active hours", () => {
  const hours = parseActiveHours("8-22");
  const at = (h: number, m = 0) => zonedTimeToEpoch(CHI, 2026, 9, 26, h, m);

  it("treats the start as inclusive and the end as exclusive", () => {
    expect(isWithinActiveHours(at(7, 59), CHI, hours)).toBe(false);
    expect(isWithinActiveHours(at(8), CHI, hours)).toBe(true);
    expect(isWithinActiveHours(at(21, 59), CHI, hours)).toBe(true);
    expect(isWithinActiveHours(at(22), CHI, hours)).toBe(false);
  });

  it("supports overnight windows", () => {
    const night = parseActiveHours("22-6");
    expect(isWithinActiveHours(at(23), CHI, night)).toBe(true);
    expect(isWithinActiveHours(at(3), CHI, night)).toBe(true);
    expect(isWithinActiveHours(at(12), CHI, night)).toBe(false);
  });

  it("rejects malformed specs", () => {
    expect(() => parseActiveHours("8 to 22")).toThrow();
    expect(() => parseActiveHours("9-9")).toThrow();
    expect(() => parseActiveHours("8-25")).toThrow();
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-09-24", "2026-09-25", "2026-09-26"], "2026-09-26")).toBe(3);
  });

  it("keeps the streak alive until a full day is missed", () => {
    expect(computeStreak(["2026-09-24", "2026-09-25"], "2026-09-26")).toBe(2);
    expect(computeStreak(["2026-09-23", "2026-09-24"], "2026-09-26")).toBe(0);
  });

  it("crosses month boundaries and ignores duplicates", () => {
    expect(computeStreak(["2026-09-30", "2026-10-01", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});

describe("formatting", () => {
  it("describes local times relative to now", () => {
    const now = zonedTimeToEpoch(CHI, 2026, 9, 26, 15);
    expect(describeLocalTime(now, zonedTimeToEpoch(CHI, 2026, 9, 26, 18, 30), CHI)).toBe("today at 6:30 PM");
    expect(describeLocalTime(now, zonedTimeToEpoch(CHI, 2026, 9, 27, 9), CHI)).toBe("tomorrow at 9:00 AM");
    expect(describeLocalTime(now, zonedTimeToEpoch(CHI, 2026, 9, 29, 9), CHI)).toBe("Tue at 9:00 AM");
    expect(describeLocalTime(now, zonedTimeToEpoch(CHI, 2026, 10, 20, 9), CHI)).toBe("Oct 20 at 9:00 AM");
  });

  it("humanizes real durations", () => {
    expect(humanizeDuration(15_000)).toBe("15 sec");
    expect(humanizeDuration(60_000)).toBe("1 min");
    expect(humanizeDuration(3 * HOUR)).toBe("3 hr");
    expect(humanizeDuration(24 * HOUR)).toBe("1 day");
    expect(humanizeDuration(72 * HOUR)).toBe("3 days");
  });
});
