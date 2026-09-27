/**
 * Server-render smoke tests: every dashboard/review panel renders real
 * store-derived payloads without throwing, with the key copy present.
 * (Effects don't run under renderToStaticMarkup, so this checks first paint.)
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { allCards, openStore, zonedTimeToEpoch, type SynapseStore } from "@synapse/core";
import { statsPayload } from "@/lib/server/account";
import { evaluateReview, nextReview } from "@/lib/server/review";
import type { ReviewNextCard, StatsResponse } from "@/lib/types";
import { ToastProvider } from "@/components/ui/Toast";
import { initialSession, sessionReducer, type Turn } from "@/components/review/session";
import { ActivityCard } from "./ActivityCard";
import { activityTotals, bucketReviewActivity, type ReviewActivityResponse } from "./activity-data";
import { Dashboard } from "./Dashboard";
import { ForecastCard } from "./ForecastCard";
import { LinkCard } from "./LinkCard";
import { MasteryCard } from "./MasteryCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { StatsRow, streakHint } from "./StatsRow";
import { WeakSpotsCard } from "./WeakSpotsCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/review",
}));

const CHI = "America/Chicago";
const T0 = zonedTimeToEpoch(CHI, 2026, 9, 26, 15);

let store: SynapseStore;
let stats: StatsResponse;
let activity: ReviewActivityResponse;

beforeAll(() => {
  store = openStore(":memory:", { timezone: CHI, dayMs: 86_400_000, morningHour: 9, newPerDay: 8 });
  const cards = allCards();
  store.gradeCard({ userId: "me", cardId: cards[0]!.id, grade: 5, source: "imessage", now: T0 - 3 * 86_400_000 });
  store.gradeCard({ userId: "me", cardId: cards[1]!.id, grade: 1, source: "web", now: T0 - 86_400_000 });
  store.gradeCard({ userId: "me", cardId: cards[2]!.id, grade: 3, source: "web", now: T0 - 60_000 });
  const problem = cards.find((card) => card.kind === "problem")!;
  store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: false, gaveUp: true, now: T0 - 30_000 });
  stats = statsPayload(store, "me", T0);
  const buckets = bucketReviewActivity(store.recentEvents("me", 5000), {
    now: T0,
    timeZone: CHI,
    dayMs: 86_400_000,
    demoScale: false,
  });
  activity = { buckets, totals: activityTotals(buckets), demoScale: false, dayMs: 86_400_000, timezone: CHI };
});

const render = (node: React.ReactNode) => renderToStaticMarkup(<ToastProvider>{node}</ToastProvider>);

describe("dashboard panels", () => {
  it("renders the skeleton before data arrives", () => {
    const html = render(<Dashboard />);
    expect(html).toContain("Your progress");
    expect(html).toContain("Loading your dashboard");
  });

  it("renders the KPI row", () => {
    const html = render(<StatsRow stats={stats} now={T0} />);
    expect(html).toContain("Due now");
    expect(html).toContain("30-day retention");
    expect(html).toContain("Streak");
    expect(html).toContain(`/ ${stats.totalCards}`);
  });

  it("renders the forecast and activity charts with accessible names", () => {
    const forecast = render(<ForecastCard forecast={stats.forecast14} timezone={CHI} demoScale={false} />);
    expect(forecast).toContain("14-day forecast");
    expect(forecast).toContain("Use the arrow keys");
    expect(forecast).toContain("Today");

    const chart = render(<ActivityCard activity={activity} reviewsByDay={stats.reviewsByDay} demoScale={false} />);
    expect(chart).toContain("Review activity");
    expect(chart).toContain("iMessage");
    expect(chart).toContain("var(--color-chart-orange)");
    expect(chart).toMatch(/\d+ reviews? in the last 30 days/);

    const fallback = render(<ActivityCard activity={null} reviewsByDay={stats.reviewsByDay} demoScale={false} />);
    expect(fallback).toContain("Review activity");
  });

  it("renders weak spots with drill links, mastery, and the activity feed", () => {
    expect(stats.weakTags.length).toBeGreaterThan(0);
    const weak = render(<WeakSpotsCard weakTags={stats.weakTags} now={T0} />);
    expect(weak).toContain("Drill now");
    expect(weak).toContain(`/review?tag=${stats.weakTags[0]!.tag}`);

    expect(render(<WeakSpotsCard weakTags={[]} now={T0} />)).toContain("No weak spots right now");

    const mastery = render(<MasteryCard mastery={stats.masteryByTag} />);
    expect(mastery).toContain("Mastery by pattern");
    expect(mastery).toContain('role="progressbar"');

    const feed = render(<RecentActivityCard events={stats.recentActivity} now={T0} />);
    expect(feed).toContain("Recent activity");
    expect(feed).toContain("Rated");
  });

  it("renders the iMessage link card in both states", () => {
    const unlinked = render(<LinkCard initial={stats.link} />);
    expect(stats.link.linkCode).toMatch(/^\d{6}$/);
    expect(unlinked).toContain(`link ${stats.link.linkCode}`);
    expect(unlinked).toContain("Not linked");
    expect(unlinked).toContain("New code");
    expect(unlinked).toContain("expire after 10 minutes");

    const linked = render(
      <LinkCard
        initial={{ linked: true, spaceId: "s1", handle: "+15551234567", platform: "imessage", linkCode: null, paused: false }}
      />,
    );
    expect(linked).toContain("Pause texts");
    expect(linked).toContain("+15551234567");
    // The owner can undo a wrong link (behind a confirm step).
    expect(linked).toContain("Wrong chat? Unlink");
  });
});

describe("streak hint", () => {
  it("does not ask for a review when an IDE stage already counts for today", () => {
    const local = openStore(":memory:", { timezone: CHI, dayMs: 86_400_000, morningHour: 9, newPerDay: 8 });
    try {
      const problem = allCards().find((card) => card.kind === "problem")!;
      local.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "invariant", passed: true, now: T0 - 60_000 });
      const today = statsPayload(local, "me", T0);
      expect(today).toMatchObject({ reviewedToday: 0, streakDays: 1, activeToday: true });
      expect(streakHint(today)).toBe("✓ Practiced today");
      expect(render(<StatsRow stats={today} now={T0} />)).toContain("Practiced today");
      // The next day nothing counts yet, so the hint asks for any practice, not specifically a review.
      expect(streakHint(statsPayload(local, "me", T0 + 86_400_000))).toBe("Practice today to keep it alive");
      expect(streakHint(statsPayload(local, "fresh", T0))).toBe("Practice today to start one");
    } finally {
      local.close();
    }
  });

  it("names today's reviews first and stays neutral for a payload without activeToday", () => {
    expect(streakHint({ reviewedToday: 2, streakDays: 4, activeToday: true })).toBe("✓ 2 reviews today");
    expect(streakHint({ reviewedToday: 0, streakDays: 4 })).toBe("Reviews, IDE stages and spars all count");
  });
});

describe("review surfaces", () => {
  it("renders the session shell in its loading state", async () => {
    const { ReviewSession } = await import("@/components/review/ReviewSession");
    const html = render(<ReviewSession />);
    expect(html).toContain("Review");
    expect(html).toContain("Prepr is typing");
    expect(html).toContain("Send answer");
  });

  it("renders a full turn: prompt, answer, feedback chips, answer key, tapback, confirmation", async () => {
    const { TurnView } = await import("@/components/review/TurnView");
    const next = nextReview(store, "me", T0) as ReviewNextCard;
    expect(next.card).not.toBeNull();
    const evaluation = await evaluateReview(store, "me", T0, { cardId: next.card.id, answer: "I don't know" });
    let state = sessionReducer(initialSession(), { type: "card", next });
    state = sessionReducer(state, { type: "hint" });
    state = sessionReducer(state, { type: "submit", answer: "I don't know", gaveUp: true });
    state = sessionReducer(state, { type: "evaluated", evaluation });
    const turn: Turn = state.turns[0]!;

    const html = render(<TurnView turn={turn} isCurrent phase="rating" />);
    expect(html).toContain(next.card.prompt.slice(0, 20).replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;"));
    expect(html).toContain("💡");
    expect(html).toContain("I don&#x27;t know");
    expect(html).toContain("Answer key");
    expect(html).toContain("Missed: ");
    expect(html).toContain("Rate your recall");
  });
});
