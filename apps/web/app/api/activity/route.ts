import { activityTotals, bucketReviewActivity, type ReviewActivityResponse } from "@/components/dashboard/activity-data";
import { json, route } from "@/lib/server/http";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Review events are ~1 per graded card; 30 days of heavy use stays well under this. */
const EVENT_SCAN_LIMIT = 5000;
const DAYS = 30;

/**
 * GET /api/activity → ReviewActivityResponse
 * Reviews per day for the last 30 days (local calendar days, or SRS days at
 * demo scale), split by surface: iMessage / web / IDE / voice.
 */
export const GET = route(() => {
  const store = getStore();
  const userId = currentUserId();
  const at = now();
  const events = store.recentEvents(userId, EVENT_SCAN_LIMIT);
  const buckets = bucketReviewActivity(events, {
    now: at,
    timeZone: store.policy.timezone,
    dayMs: store.policy.dayMs,
    demoScale: store.demoScale,
    days: DAYS,
  });
  const body: ReviewActivityResponse = {
    buckets,
    totals: activityTotals(buckets),
    demoScale: store.demoScale,
    dayMs: store.policy.dayMs,
    timezone: store.policy.timezone,
  };
  return json(body);
});
