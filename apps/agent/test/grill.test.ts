import { afterEach, describe, expect, it } from "vitest";
import { SMS_GRILL_QUESTIONS } from "../src/grill";
import { AgentState, userScope } from "../src/state";
import { chicago, createHarness, linkByText, MINUTE, WEB_USER, type Harness } from "./support";

const RESUME = [
  "Jordan Lee",
  "EXPERIENCE",
  "- Led migration of the checkout service from a monolith to 4 microservices, cutting p99 latency by 45%",
  "- Built a Redis caching layer for the pricing API serving 12k requests per second",
  "PROJECTS",
  "- Architected a real-time collaborative notes app with WebSockets and Postgres used by 2,000 students",
].join("\n");

let h: Harness | undefined;
afterEach(() => h?.cleanup());

async function text(body: string) {
  h!.clock.advance(MINUTE);
  await h!.controller.handleText(h!.space, body, { handle: "(314) 555-0101" });
}

describe("resume grill over iMessage", () => {
  it("asks for a resume, grills it, texts a verdict, saves the report, and deletes the resume", async () => {
    h = createHarness({ start: chicago(9, 26, 10) });
    await linkByText(h);

    await text("grill");
    expect(h.space.last.text).toMatch(/Paste your resume/);

    await text("too short");
    expect(h.space.last.text).toMatch(/too short to be a resume/);

    await text(RESUME);
    expect(h.space.last.text).toMatch(new RegExp(`🔥 1/${SMS_GRILL_QUESTIONS}: `));

    for (let i = 1; i < SMS_GRILL_QUESTIONS; i++) {
      await text("I owned the pricing split and measured p99 in Datadog: 820 ms down to 450 ms over two weeks.");
      if (i < SMS_GRILL_QUESTIONS - 1) expect(h.space.last.text).toMatch(new RegExp(`🔥 ${i + 1}/${SMS_GRILL_QUESTIONS}: `));
    }
    await text("We did it together as a team.");
    expect(h.space.last.text).toMatch(/^🔥 Resume grill verdict: \d+\/100/);
    expect(h.space.last.text).toContain("http://synapse.test/grill");

    const saved = h.store.listPracticeSessions(WEB_USER, "grill");
    expect(saved).toHaveLength(1);
    expect(JSON.stringify(saved[0]!.report)).not.toContain("Jordan Lee");
    expect(new AgentState(h.store).get(userScope(WEB_USER), "grill")).toBeUndefined();
  });

  it("'end grill' before any answer cancels; after answers it gives the verdict so far", async () => {
    h = createHarness({ start: chicago(9, 26, 10) });
    await linkByText(h);
    await text("grill");
    await text("end grill");
    expect(h.space.last.text).toMatch(/Grill cancelled/);
    expect(h.store.listPracticeSessions(WEB_USER, "grill")).toHaveLength(0);

    await text("grill me");
    await text(RESUME);
    await text("It was mostly the team, honestly.");
    await text("end grill");
    expect(h.space.last.text).toMatch(/^🔥 Resume grill verdict/);
    expect(h.store.listPracticeSessions(WEB_USER, "grill")).toHaveLength(1);
    await text("end grill");
    expect(h.space.last.text).toMatch(/No grill running/);
  });

  it("holds back scheduled cards while a grill is running", async () => {
    h = createHarness({ start: chicago(9, 26, 10) });
    await linkByText(h);
    await text("idk");
    await text("❤️");
    await text("grill");
    h.clock.advance(3 * 60 * MINUTE);
    const report = await h.controller.tick(h.clock.now());
    expect(report.results.find((result) => result.userId === WEB_USER)).toMatchObject({ action: "skipped", reason: "grilling" });
  });
});
