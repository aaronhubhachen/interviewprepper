import { afterEach, describe, expect, it } from "vitest";
import { chicago, createHarness, linkByText, MINUTE, WEB_USER, type Harness } from "./support";

let h: Harness | undefined;
afterEach(() => h?.cleanup());

describe("weekly report card", () => {
  it("texts the card once on Sunday evening and on demand", async () => {
    // 2026-09-27 is a Sunday.
    h = createHarness({ start: chicago(9, 27, 10) });
    await linkByText(h);
    h.store.recordPracticeSession({ userId: WEB_USER, kind: "bot", subject: "p-two-sum", score: 72, report: {}, now: h.clock.now() });

    const morning = await h.controller.tick(h.clock.advance(MINUTE));
    expect(morning.results[0]!.report).toBeUndefined();

    h.clock.advance(chicago(9, 27, 18, 30) - h.clock.now());
    const evening = await h.controller.tick(h.clock.now());
    expect(evening.results[0]).toMatchObject({ action: "sent", report: true });
    expect(h.space.last.text).toMatch(/^📊 Weekly report card: [ABCD]/);
    expect(h.space.last.text).toContain("🤖 AI-use score: 72/100");
    expect(h.space.last.text).toContain("http://synapse.test/report");

    const later = await h.controller.tick(h.clock.advance(30 * MINUTE));
    expect(later.results[0]!.report).toBeUndefined();

    h.clock.advance(MINUTE);
    await h.controller.handleText(h.space, "report card", { handle: "(314) 555-0101" });
    expect(h.space.last.text).toMatch(/^📊 Weekly report card/);
  });

  it("stays quiet for users with no activity", async () => {
    h = createHarness({ start: chicago(9, 27, 18, 30) });
    await linkByText(h);
    h.store.clearPending(WEB_USER);
    const result = await h.controller.tick(h.clock.advance(MINUTE));
    expect(result.results[0]!.report).toBeUndefined();
  });
});
