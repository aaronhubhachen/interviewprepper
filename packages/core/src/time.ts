/** Timezone-aware calendar helpers built on Intl only (browser-safe, no dependencies). */

export interface LocalParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** 0-23 */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday */
  weekday: number;
}

export interface ActiveHours {
  /** Inclusive local hour, 0-23. */
  startHour: number;
  /** Exclusive local hour, 1-24. */
  endHour: number;
}

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function localParts(now: number, timeZone: string): LocalParts {
  const fields: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(now)) fields[part.type] = part.value;
  return {
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
    hour: Number(fields.hour) % 24,
    minute: Number(fields.minute),
    second: Number(fields.second),
    weekday: WEEKDAYS.indexOf(fields.weekday!),
  };
}

export function localHour(now: number, timeZone: string): number {
  return localParts(now, timeZone).hour;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** "YYYY-MM-DD" in the given zone. */
export function localDayKey(now: number, timeZone: string): string {
  const { year, month, day } = localParts(now, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) throw new Error(`Invalid day key: ${dayKey}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function shiftDayKey(dayKey: string, days: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Offset of the zone from UTC at the given instant (ms; negative west of Greenwich). */
function zoneOffsetMs(epoch: number, timeZone: string): number {
  const p = localParts(epoch, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(epoch / 1000) * 1000;
}

/**
 * Epoch ms of a local wall-clock time. Ambiguous fall-back times resolve to one
 * of the two instants; nonexistent spring-forward times shift by the DST gap.
 */
export function zonedTimeToEpoch(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = wallClock - zoneOffsetMs(wallClock, timeZone);
  const correctedOffset = zoneOffsetMs(firstGuess, timeZone);
  return wallClock - correctedOffset;
}

export function startOfLocalDay(now: number, timeZone: string): number {
  const { year, month, day } = localParts(now, timeZone);
  return zonedTimeToEpoch(timeZone, year, month, day);
}

/** Epoch ms at which the local day identified by dayKey begins. */
export function dayKeyStart(dayKey: string, timeZone: string): number {
  const { year, month, day } = parseDayKey(dayKey);
  return zonedTimeToEpoch(timeZone, year, month, day);
}

/** The next instant strictly after `now` whose local time is hour:minute (e.g. "tomorrow 9:00 AM"). */
export function nextLocalTime(now: number, timeZone: string, hour: number, minute = 0): number {
  const today = localDayKey(now, timeZone);
  for (const offset of [0, 1, 2]) {
    const { year, month, day } = parseDayKey(shiftDayKey(today, offset));
    const candidate = zonedTimeToEpoch(timeZone, year, month, day, hour, minute);
    if (candidate > now) return candidate;
  }
  throw new Error("unreachable: a local time always recurs within two days");
}

/** Parses "8-22" (start inclusive, end exclusive). "0-24" means always. */
export function parseActiveHours(spec: string): ActiveHours {
  const match = /^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/.exec(spec);
  if (!match) throw new Error(`Invalid active hours "${spec}" (expected e.g. "8-22")`);
  const startHour = Number(match[1]);
  const endHour = Number(match[2]);
  if (startHour > 23 || endHour > 24 || startHour === endHour) {
    throw new Error(`Invalid active hours "${spec}"`);
  }
  return { startHour, endHour };
}

/** Supports overnight windows such as "22-6". */
export function isWithinActiveHours(now: number, timeZone: string, hours: ActiveHours): boolean {
  const hour = localHour(now, timeZone);
  return hours.startHour < hours.endHour
    ? hour >= hours.startHour && hour < hours.endHour
    : hour >= hours.startHour || hour < hours.endHour;
}

/**
 * Consecutive active days ending today — or yesterday, so a streak stays alive
 * until the user misses a full day.
 */
export function computeStreak(activeDayKeys: Iterable<string>, todayKey: string): number {
  const active = new Set(activeDayKeys);
  let cursor = active.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

/** "9:00 AM" */
export function formatLocalClock(epoch: number, timeZone: string): string {
  let formatter = clockFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
    clockFormatters.set(timeZone, formatter);
  }
  // Recent ICU versions put a narrow no-break space before AM/PM; keep plain ASCII for SMS.
  return formatter.format(epoch).replace(/[  ]/g, " ");
}

/** "today at 9:00 AM", "tomorrow at 9:00 AM", "Mon at 9:00 AM", or "Oct 3 at 9:00 AM". */
export function describeLocalTime(now: number, target: number, timeZone: string): string {
  const clock = formatLocalClock(target, timeZone);
  const today = localDayKey(now, timeZone);
  const day = localDayKey(target, timeZone);
  if (day === today) return `today at ${clock}`;
  if (day === shiftDayKey(today, 1)) return `tomorrow at ${clock}`;
  if (target > now && target - now < 6 * 86_400_000) {
    return `${WEEKDAYS[localParts(target, timeZone).weekday]} at ${clock}`;
  }
  const date = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(target);
  return `${date} at ${clock}`;
}

/** Coarse real-time duration: "15 sec", "3 min", "2 hr", "4 days". */
export function humanizeDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
