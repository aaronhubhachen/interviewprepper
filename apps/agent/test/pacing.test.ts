/**
 * Scheduler pacing with the scheduler ticking the way the live agent does
 * (every SYNAPSE_TICK_MS) and the default push gap, instead of jumping the
 * clock between single ticks.
 */
import { afterEach, describe, expect, it } from "vitest";
import { MIN_PUSH_GAP_MS, type TickResult } from "../src/controller";
import {
  HOUR,
  MINUTE,
  SECOND,
  WEB_USER,
  chicago,
  createHarness,
  isProbe,
  linkByText,
  linkQuietly,
  pending,
  pendingCard,
  problemWithDrills,
  type Harness,
} from "./support";

const DEMO_DAY_MS = 60_000;

let h: Harness;
let nextTickAt = 0;
let tickMs = 5 * SECOND;
let results: (TickResult & { at: number })[] = [];

afterEach(() => h?.cleanup());

function setup(start: number, options: { dayMs?: number; tickMs?: number } = {}): Harness {
  // pushGapMs: undefined → the real default (max(dayMs / 48, 30 s)), not the harness's 0.
  h = createHarness({ start, dayMs: options.dayMs, policy: { pushGapMs: undefined } });
  tickMs = options.tickMs ?? 5 * SECOND;
  nextTickAt = start + tickMs;
  results = [];
  return h;
}

/** Runs every scheduled tick up to and including `at`, then leaves the clock at `at`. */
async function until(at: number): Promise<void> {
  while (nextTickAt <= at) {
    h.clock.set(nextTickAt);
    const mine = (await h.controller.tick()).results.find((result) => result.userId === WEB_USER);
    if (mine) results.push({ ...mine, at: nextTickAt });
    nextTickAt += tickMs;
  }
  h.clock.set(at);
}

function sentBetween(from: number, to: number): (TickResult & { at: number })[] {
  return results.filter((result) => result.action === "sent" && result.at > from && result.at <= to);
}

async function rateFeedback(emoji: string): Promise<void> {
  await h.controller.handleReaction(h.space, emoji, pending(h).feedbackMessageId);
}

function recordStruggle() {
  return h.store.recordIdeAttempt({
    userId: WEB_USER,
    problemId: problemWithDrills().id,
    stage: "code",
    passed: false,
    gaveUp: true,
    now: h.clock.now(),
  });
}

describe("README demo script at demo scale (1 SRS day = 1 min, 5 s ticks)", () => {
  it("no extra card sneaks in: 'more' serves a card, the relearn comes back ~15 s after 'idk', and the drill lands on time", async () => {
    const t0 = chicago(9, 28, 14);
    setup(t0, { dayMs: DEMO_DAY_MS });
    expect(h.controller.policy.pushGapMs).toBe(MIN_PUSH_GAP_MS);

    await linkByText(h); // 0:00 → 🔗 Linked!, briefing, first card
    expect(h.space.texts[1]).toMatch(/^☕ Morning Prepr — /);

    await until(t0 + 20 * SECOND);
    await h.controller.handleText(h.space, pendingCard(h).answerKey);
    await until(t0 + 24 * SECOND);
    await rateFeedback("❤️");
    expect(h.space.last.text).toMatch(/^🧠 Locked in\./);

    await until(t0 + 32 * SECOND);
    await h.controller.handleText(h.space, "more");
    expect(isProbe(h.space.last.text)).toBe(true);
    expect(h.space.last.text).not.toMatch(/Still open/);
    const second = pendingCard(h);

    await until(t0 + 35 * SECOND);
    await h.controller.handleReaction(h.space, "❓", pending(h).questionMessageId);
    expect(h.space.last.text).toMatch(/^💡 Hint: /);
    await until(t0 + 40 * SECOND);
    await h.controller.handleText(h.space, "idk");
    expect(h.space.last.text).toContain(second.answerKey);

    await until(t0 + 55 * SECOND);
    expect(sentBetween(t0, t0 + 50 * SECOND)).toEqual([]);
    expect(sentBetween(t0 + 50 * SECOND, t0 + 55 * SECOND)).toEqual([expect.objectContaining({ cardId: second.id })]);
    expect(h.space.last.text).toContain("🔁 Back for round two.");

    // 1:15 IDE struggle → "Prepr will text you a drill in 1 min". The relearn is still unanswered.
    await until(t0 + 75 * SECOND);
    const attempt = recordStruggle();
    expect(attempt.drillAt).toBe(t0 + 135 * SECOND);

    await until(t0 + 135 * SECOND);
    const drills = sentBetween(t0 + 55 * SECOND, t0 + 135 * SECOND);
    expect(drills).toHaveLength(1);
    expect(drills[0]).toMatchObject({ at: t0 + 135 * SECOND, morning: true, preemptedCardId: second.id });
    expect(attempt.drills.map((drill) => drill.cardId)).toContain(drills[0]!.cardId);
    expect(h.space.texts.at(-2)).toMatch(/^☕ Morning Prepr — .*Weak spot: .*you struggled on/);
    expect(h.space.last.text).toContain("🎯 Drill: ");
  });

  it("a fresh card is held back while an IDE drill is about to come due", async () => {
    const t0 = chicago(9, 28, 14);
    setup(t0, { dayMs: DEMO_DAY_MS });
    await linkByText(h);
    await until(t0 + 20 * SECOND);
    await h.controller.handleText(h.space, pendingCard(h).answerKey);
    await until(t0 + 25 * SECOND);
    await rateFeedback("👍");

    await until(t0 + 30 * SECOND);
    const attempt = recordStruggle(); // drill due at +90 s
    const problemId = problemWithDrills().id;

    // The struggled problem itself comes back as a relearn (relearns are never held back); answer and rate it.
    await until(t0 + 50 * SECOND);
    expect(sentBetween(t0, t0 + 50 * SECOND)).toEqual([expect.objectContaining({ cardId: problemId })]);
    await h.controller.handleText(h.space, pendingCard(h).answerKey);
    await until(t0 + 55 * SECOND);
    await rateFeedback("👍");

    // At +85 s the push gap has passed, but a fresh card could still be open when the drill is due at +90 s.
    await until(t0 + 90 * SECOND);
    expect(results.find((result) => result.at === t0 + 85 * SECOND)).toMatchObject({ action: "skipped", reason: "drill-soon" });
    const sent = sentBetween(t0 + 50 * SECOND, t0 + 90 * SECOND);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ at: t0 + 90 * SECOND, morning: true });
    expect(attempt.drills.map((drill) => drill.cardId)).toContain(sent[0]!.cardId);
  });

  it("the daily cap counts one SRS day, so an idle demo never goes silent before the drill", async () => {
    const t0 = chicago(9, 28, 14);
    setup(t0, { dayMs: DEMO_DAY_MS });
    await linkByText(h);
    await until(t0 + 40 * MINUTE);
    expect(results.filter((result) => result.reason === "daily-cap")).toEqual([]);
    const pushes = h.store.db.prepare("SELECT COUNT(*) AS n FROM push_log WHERE user_id = ?").get(WEB_USER) as { n: number };
    expect(pushes.n).toBeGreaterThan(12);

    const struggledAt = h.clock.now();
    const attempt = recordStruggle();
    await until(struggledAt + 65 * SECOND);
    const drills = sentBetween(struggledAt, struggledAt + 65 * SECOND);
    expect(drills.map((result) => result.cardId).some((cardId) => attempt.drills.some((drill) => drill.cardId === cardId))).toBe(true);
  });
});

describe("real scale pacing", () => {
  it("a relearn comes back ~10 min after 'idk' as promised, not after the 30 min push gap", async () => {
    const t0 = chicago(9, 28, 10);
    setup(t0, { tickMs: 30 * SECOND });
    expect(h.controller.policy.pushGapMs).toBe(30 * MINUTE);
    await linkByText(h);
    const card = pendingCard(h);
    await until(t0 + 20 * SECOND);
    await h.controller.handleText(h.space, "idk");
    expect(h.space.last.text).toContain("comes back in 10m");

    await until(t0 + 40 * MINUTE);
    const [relearn] = sentBetween(t0, t0 + 40 * MINUTE);
    expect(relearn).toMatchObject({ cardId: card.id });
    expect(relearn!.at).toBeGreaterThanOrEqual(t0 + 20 * SECOND + 10 * MINUTE);
    expect(relearn!.at).toBeLessThanOrEqual(t0 + 20 * SECOND + 11 * MINUTE);
  });

  it("the first briefing of an afternoon is a check-in, not '☕ Morning Prepr'", async () => {
    setup(chicago(9, 28, 13));
    linkQuietly(h);
    h.clock.set(chicago(9, 28, 14));
    await h.controller.tick();
    expect(h.space.texts[0]).toMatch(/^🧠 Prepr check-in — /);
    expect(h.space.texts[1]).toMatch(/^🧠 Prepr · /);
    expect(h.space.texts.join("\n")).not.toContain("☕ Morning");

    h.store.clearPending(WEB_USER);
    h.clock.set(chicago(9, 29, 9, 30));
    await h.controller.tick();
    expect(h.space.texts.at(-2)).toMatch(/^☕ Morning Prepr — /);
  });

  it("linking in the evening gets a check-in too", async () => {
    setup(chicago(9, 28, 21, 30));
    await linkByText(h);
    expect(h.space.texts[1]).toMatch(/^🧠 Prepr check-in — /);
  });

  it("a queued drill sets aside an untouched card texted after the IDE struggle", async () => {
    setup(chicago(9, 28, 19));
    linkQuietly(h);
    h.clock.set(chicago(9, 28, 20));
    const attempt = recordStruggle();
    h.clock.set(chicago(9, 28, 21, 30));
    const evening = (await h.controller.tick()).results[0]!;
    expect(evening).toMatchObject({ action: "sent" });
    expect(attempt.drills.map((drill) => drill.cardId)).not.toContain(evening.cardId);

    h.clock.set(chicago(9, 29, 9));
    const morning = (await h.controller.tick()).results[0]!;
    expect(morning).toMatchObject({ action: "sent", morning: true, preemptedCardId: evening.cardId });
    expect(attempt.drills.map((drill) => drill.cardId)).toContain(morning.cardId);
    expect(h.space.texts.at(-2)).toMatch(/^☕ Morning Prepr — /);

    // The drill itself is never set aside by the next drill.
    h.clock.set(chicago(9, 29, 9) + HOUR);
    expect((await h.controller.tick()).results[0]).toMatchObject({ reason: "outstanding" });
  });
});
