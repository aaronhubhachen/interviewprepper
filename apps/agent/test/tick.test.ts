import { afterEach, describe, expect, it } from "vitest";
import { allCards, drillCardsForProblem, tagLabel } from "@synapse/core";
import type { TickResult } from "../src/controller";
import {
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  WEB_USER,
  chicago,
  completeProbe,
  createHarness,
  isProbe,
  linkQuietly,
  pending,
  problemWithDrills,
  type Harness,
  type HarnessOptions,
} from "./support";

let h: Harness;

afterEach(() => h?.cleanup());

function setup(options: Partial<HarnessOptions> & { start: number }): Harness {
  h = createHarness(options);
  linkQuietly(h);
  return h;
}

async function tickAt(at: number): Promise<TickResult> {
  h.clock.set(at);
  const report = await h.controller.tick();
  const mine = report.results.find((result) => result.userId === WEB_USER);
  if (!mine) throw new Error("web user missing from tick report");
  return mine;
}

describe("tick: active hours", () => {
  it("stays quiet before SYNAPSE_ACTIVE_HOURS start and pushes once they open", async () => {
    setup({ start: chicago(9, 28, 6) });
    expect(await tickAt(chicago(9, 28, 7, 59))).toMatchObject({ action: "skipped", reason: "quiet-hours" });
    expect(h.space.sent).toHaveLength(0);

    const opened = await tickAt(chicago(9, 28, 8));
    expect(opened).toMatchObject({ action: "sent", morning: false });
    expect(h.space.sent).toHaveLength(1);
    expect(h.space.last.text).toMatch(/^🧠 Prepr · /);
  });

  it("stays quiet after the active window closes", async () => {
    setup({ start: chicago(9, 28, 21) });
    expect(await tickAt(chicago(9, 28, 22, 5))).toMatchObject({ action: "skipped", reason: "quiet-hours" });
    expect(await tickAt(chicago(9, 29, 3))).toMatchObject({ action: "skipped", reason: "quiet-hours" });
    expect(h.space.sent).toHaveLength(0);
  });

  it("ignores active hours at demo scale (SYNAPSE_DAY_MS < 1h)", async () => {
    setup({ start: chicago(9, 28, 2), dayMs: 60_000 });
    const result = await tickAt(chicago(9, 28, 3));
    expect(result).toMatchObject({ action: "sent", morning: true });
    expect(h.space.texts[0]).toMatch(/^☕ Morning Prepr — /);
    expect(isProbe(h.space.texts[1]!)).toBe(true);
  });
});

describe("tick: one outstanding probe", () => {
  it("never sends a second probe while one is open", async () => {
    setup({ start: chicago(9, 28, 9, 30) });
    expect(await tickAt(chicago(9, 28, 10))).toMatchObject({ action: "sent" });
    const sent = h.space.sent.length;
    expect(await tickAt(chicago(9, 28, 10, 1))).toMatchObject({ action: "skipped", reason: "outstanding" });
    expect(await tickAt(chicago(9, 28, 12))).toMatchObject({ action: "skipped", reason: "outstanding" });
    expect(h.space.sent.length).toBe(sent);
  });

  it("expires an unanswered probe after ~6 SRS hours and moves on to another card", async () => {
    setup({ start: chicago(9, 28, 9, 30) });
    const first = await tickAt(chicago(9, 28, 10));
    const expiredCard = first.cardId!;

    expect(await tickAt(chicago(9, 28, 15, 59))).toMatchObject({ reason: "outstanding" });
    const next = await tickAt(chicago(9, 28, 16));
    expect(next).toMatchObject({ action: "sent", expiredCardId: expiredCard });
    expect(next.cardId).not.toBe(expiredCard);
    expect(h.store.getProgress(WEB_USER, expiredCard)).toBeNull();
  });

  it("measures staleness from the feedback once the user has answered", async () => {
    setup({ start: chicago(9, 28, 9, 30) });
    await tickAt(chicago(9, 28, 10));
    h.clock.set(chicago(9, 28, 15));
    await h.controller.handleText(h.space, "a hash map with two pointers and a heap");
    expect(pending(h).phase).toBe("awaiting_grade");

    expect(await tickAt(chicago(9, 28, 16, 30))).toMatchObject({ reason: "outstanding" });
    expect(await tickAt(chicago(9, 28, 21, 1))).toMatchObject({ action: "sent", expiredCardId: expect.any(String) });
  });
});

describe("tick: daily cap and pacing", () => {
  it("stops at SYNAPSE_MAX_DAILY_PUSHES and resumes the next day", async () => {
    setup({ start: chicago(9, 28, 9, 30), policy: { maxDailyPushes: 3 } });
    expect(await tickAt(chicago(9, 28, 10))).toMatchObject({ action: "sent", morning: true }); // briefing + probe = 2
    await completeProbe(h);
    expect(await tickAt(chicago(9, 28, 10, 30))).toMatchObject({ action: "sent", morning: false }); // 3
    await completeProbe(h);
    expect(await tickAt(chicago(9, 28, 11))).toMatchObject({ action: "skipped", reason: "daily-cap" });
    expect(h.store.pushesToday(WEB_USER, h.clock.now())).toBe(3);

    expect(await tickAt(chicago(9, 29, 10))).toMatchObject({ action: "sent", morning: true });
  });

  it("waits pushGapMs after the last push or reply before texting again", async () => {
    setup({ start: chicago(9, 28, 9, 30), policy: { pushGapMs: 30 * MINUTE } });
    expect(await tickAt(chicago(9, 28, 10))).toMatchObject({ action: "sent" });
    h.clock.set(chicago(9, 28, 10, 5));
    await completeProbe(h); // last reply at ~10:05:35
    expect(await tickAt(chicago(9, 28, 10, 20))).toMatchObject({ action: "skipped", reason: "cooldown" });
    expect(await tickAt(chicago(9, 28, 10, 36))).toMatchObject({ action: "sent" });
  });

  it("skips users that are not linked", async () => {
    h = createHarness({ start: chicago(9, 28, 10) });
    const report = await h.controller.tick();
    expect(report.results).toEqual([{ userId: WEB_USER, action: "skipped", reason: "unlinked" }]);
  });
});

describe("tick: morning briefing", () => {
  it("sends the ☕ briefing as the first push after SYNAPSE_MORNING_HOUR, once per day", async () => {
    setup({ start: chicago(9, 28, 7) });
    expect(await tickAt(chicago(9, 28, 8, 30))).toMatchObject({ action: "sent", morning: false });
    await completeProbe(h);

    const morning = await tickAt(chicago(9, 28, 9));
    expect(morning).toMatchObject({ action: "sent", morning: true });
    const [briefing, probe] = h.space.texts.slice(-2);
    expect(briefing).toContain("☕ Morning Prepr —");
    expect(briefing).toContain("1-day streak");
    expect(probe).toMatch(/^☕ Morning Prepr · /);
    expect(isProbe(probe!)).toBe(true);
    await completeProbe(h);

    expect(await tickAt(chicago(9, 28, 11))).toMatchObject({ action: "sent", morning: false });
    expect(h.space.texts.filter((text) => text.startsWith("☕ Morning Prepr — "))).toHaveLength(1);
    await completeProbe(h);

    expect(await tickAt(chicago(9, 29, 9, 15))).toMatchObject({ action: "sent", morning: true });
    expect(h.space.texts.filter((text) => text.startsWith("☕ Morning Prepr — "))).toHaveLength(2);
  });

  it("does not record a briefing when nothing is due", async () => {
    setup({ start: chicago(9, 28, 9), newPerDay: 0 });
    expect(await tickAt(chicago(9, 28, 10))).toMatchObject({ action: "skipped", reason: "nothing-due" });
    expect(h.space.sent).toHaveLength(0);
    expect(h.store.morningSentToday(WEB_USER, h.clock.now())).toBe(false);
  });
});

describe("IDE struggle → next-morning drill", () => {
  it("surfaces the queued drill the next morning with the weak spot in the briefing", async () => {
    setup({ start: chicago(9, 28, 19) });
    const problem = problemWithDrills();
    const attempt = h.store.recordIdeAttempt({
      userId: WEB_USER,
      problemId: problem.id,
      stage: "invariant",
      passed: false,
      now: chicago(9, 28, 20),
    });
    expect(attempt.struggled).toBe(true);
    expect(attempt.drillLabel).toBe("tomorrow at 9:00 AM");
    const drillIds = attempt.drills.map((drill) => drill.cardId);
    expect(drillIds.length).toBeGreaterThan(0);
    expect(drillIds).toContain(drillCardsForProblem(problem)[0]!.id);

    const result = await tickAt(chicago(9, 29, 9));
    expect(result).toMatchObject({ action: "sent", morning: true });
    expect(drillIds).toContain(result.cardId);

    const [briefing, probe] = h.space.texts.slice(-2);
    const weakLabels = problem.weakTags.map(tagLabel);
    expect(weakLabels.some((label) => briefing!.includes(`Weak spot: ${label}`))).toBe(true);
    expect(briefing).toContain(`(you struggled on ${problem.title} last night)`);
    expect(probe).toMatch(/^☕ Morning Prepr · /);
    expect(probe).toContain("🎯 Drill: ");
    expect(probe).toContain(`from your IDE run on ${problem.title}`);
  });

  it("at demo scale, the drill arrives one SRS day later with its own briefing", async () => {
    setup({ start: chicago(9, 28, 10), dayMs: 60_000 });
    expect(await tickAt(chicago(9, 28, 10))).toMatchObject({ action: "sent", morning: true });
    await completeProbe(h);

    const problem = problemWithDrills();
    const attempt = h.store.recordIdeAttempt({
      userId: WEB_USER,
      problemId: problem.id,
      stage: "code",
      passed: false,
      gaveUp: true,
      now: h.clock.now(),
    });
    expect(attempt.drillAt).toBe(h.clock.now() + 60_000);

    const drill = await tickAt(h.clock.now() + 61 * SECOND);
    expect(drill).toMatchObject({ action: "sent", morning: true });
    expect(attempt.drills.map((entry) => entry.cardId)).toContain(drill.cardId);
    expect(h.space.texts.at(-2)).toContain(`you struggled on ${problem.title} last night`);
    await completeProbe(h);

    const after = await tickAt(h.clock.now() + 10 * SECOND);
    expect(after.morning).toBeFalsy();
  });
});

describe("concurrency guard", () => {
  it("a tick racing a 'more' sends exactly one probe (tick first)", async () => {
    setup({ start: chicago(9, 28, 10) });
    const [report] = await Promise.all([h.controller.tick(), h.controller.handleText(h.space, "more")]);
    expect(h.space.probes).toHaveLength(1);
    expect(report.results[0]).toMatchObject({ action: "sent" });
    expect(h.space.last.text).toMatch(/^🧠 Still open: /);
  });

  it("a 'more' racing a tick sends exactly one probe ('more' first)", async () => {
    setup({ start: chicago(9, 28, 10) });
    const [, report] = await Promise.all([h.controller.handleText(h.space, "more"), h.controller.tick()]);
    expect(h.space.probes).toHaveLength(1);
    expect(report.results[0]).toMatchObject({ action: "skipped", reason: "busy" });
    expect(h.store.getPending(WEB_USER)?.phase).toBe("awaiting_answer");
  });

  it("many concurrent ticks and 'more's still leave one outstanding probe", async () => {
    setup({ start: chicago(9, 28, 10) });
    await Promise.all([
      h.controller.tick(),
      h.controller.handleText(h.space, "more"),
      h.controller.tick(),
      h.controller.handleText(h.space, "next"),
      h.controller.tick(),
    ]);
    await h.controller.idle();
    expect(h.space.probes).toHaveLength(1);
  });

  it("a busy chat is skipped while other users are still served", async () => {
    setup({ start: chicago(9, 28, 10) });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = createHarnessSpaceGate(gate);
    // A second, already-studying user whose chat is stuck mid-send.
    const { user: other } = h.store.ensureUserForSpace({ spaceId: slow.space.id, handle: "+15550009999" }, h.clock.now());
    h.store.gradeCard({ userId: other.id, cardId: allMicroIds()[0]!, grade: 3, source: "imessage", now: h.clock.now() - DAY });
    const busy = h.controller.handleText(slow.space, "more", { handle: "+15550009999" });

    const report = await h.controller.tick();
    expect(report.results.find((result) => result.userId === WEB_USER)).toMatchObject({ action: "sent" });
    expect(report.results.find((result) => result.userId === other.id)).toMatchObject({ action: "skipped", reason: "busy" });
    release();
    await busy;
    expect(h.store.getPending(other.id)?.phase).toBe("awaiting_answer");
  });
});

function allMicroIds(): string[] {
  return allCards().filter((card) => card.kind === "micro").map((card) => card.id);
}

/** A chat whose sends block until `gate` resolves (keeps that chat's lock busy). */
function createHarnessSpaceGate(gate: Promise<void>) {
  const space = {
    id: "iMessage;-;+15550009999",
    sent: [] as string[],
    async send(text: string) {
      await gate;
      space.sent.push(text);
      return { id: `slow#${space.sent.length}` };
    },
  };
  return { space: space as unknown as Harness["space"] };
}

describe("probe TTL at demo scale", () => {
  it("keeps a real-time floor so demo users have time to answer", async () => {
    setup({ start: chicago(9, 28, 10), dayMs: 60_000 });
    expect(h.controller.policy.probeTtlMs).toBe(3 * MINUTE);
    await tickAt(chicago(9, 28, 10));
    expect(await tickAt(chicago(9, 28, 10) + 2 * MINUTE)).toMatchObject({ reason: "outstanding" });
    expect(await tickAt(chicago(9, 28, 10) + 3 * MINUTE)).toMatchObject({ action: "sent", expiredCardId: expect.any(String) });
  });

  it("uses dayMs / 4 (6h) at real scale", () => {
    setup({ start: chicago(9, 28, 10) });
    expect(h.controller.policy.probeTtlMs).toBe(DAY / 4);
    expect(DAY / 4).toBe(6 * HOUR);
  });
});
