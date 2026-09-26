import { analyzeTranscript } from "@synapse/core/transcript";
import { describe, expect, it } from "vitest";
import {
  clampDurationMs,
  countWords,
  estimateSpokenMs,
  fillerReading,
  liveAnalysis,
  liveNudge,
  liveStar,
  nextStarPart,
  ownershipReading,
  paceReading,
  scoreBand,
  starCount,
  timerPhase,
  timerProgress,
  timerReading,
} from "./metrics";

const STRONG_ANSWER =
  "At my last internship our checkout service was timing out during peak traffic. " +
  "My goal was to cut p99 latency before the holiday launch. " +
  "I profiled the endpoint, I found an N plus one query, and I added a Redis cache in front of the pricing service. " +
  "As a result p99 latency dropped 60% and checkout errors fell to almost zero.";

describe("timer", () => {
  it("moves through on-track, wrap-up, over, rambling", () => {
    expect(timerPhase(30_000)).toBe("on-track");
    expect(timerPhase(105_000)).toBe("wrap-up");
    expect(timerPhase(125_000)).toBe("over");
    expect(timerPhase(151_000)).toBe("rambling");
    expect(timerReading(0).level).toBe("idle");
    expect(timerReading(125_000).level).toBe("warn");
    expect(timerReading(160_000).level).toBe("bad");
  });

  it("fills the ring to the 2-minute target and clamps", () => {
    expect(timerProgress(60_000)).toBe(0.5);
    expect(timerProgress(500_000)).toBe(1);
    expect(timerProgress(-5)).toBe(0);
  });
});

describe("readings", () => {
  it("pace waits for enough signal, then bands around 110-170 wpm", () => {
    expect(paceReading(300, 5, 3000).level).toBe("idle");
    expect(paceReading(140, 60, 30_000)).toEqual({ level: "good", label: "Conversational" });
    expect(paceReading(100, 60, 30_000).level).toBe("warn");
    expect(paceReading(80, 60, 30_000).level).toBe("bad");
    expect(paceReading(180, 60, 30_000).level).toBe("warn");
    expect(paceReading(210, 60, 30_000).level).toBe("bad");
  });

  it("filler rate bands match core's improvement threshold (3 per 100 words)", () => {
    expect(fillerReading(10, 5).level).toBe("idle");
    expect(fillerReading(2.9, 100).level).toBe("good");
    expect(fillerReading(3, 100).level).toBe("warn");
    expect(fillerReading(6, 100).level).toBe("bad");
  });

  it("ownership favors first person", () => {
    expect(ownershipReading(1, 1).level).toBe("idle");
    expect(ownershipReading(8, 2).level).toBe("good");
    expect(ownershipReading(5, 5).level).toBe("warn");
    expect(ownershipReading(1, 6).level).toBe("bad");
  });

  it("score bands", () => {
    expect(scoreBand(90).label).toBe("Offer-ready");
    expect(scoreBand(72).label).toBe("Strong");
    expect(scoreBand(60).level).toBe("warn");
    expect(scoreBand(10).level).toBe("bad");
  });
});

describe("STAR helpers", () => {
  it("counts detected parts and names the next one", () => {
    const partial = analyzeTranscript("At my last job we had an outage.", 10_000);
    expect(starCount(partial.star)).toBe(1);
    expect(nextStarPart(partial.star)).toBe("task");
    const full = analyzeTranscript(STRONG_ANSWER, 60_000);
    expect(starCount(full.star)).toBe(4);
    expect(nextStarPart(full.star)).toBeNull();
  });
});

describe("liveStar", () => {
  it("does not light Result from a goal sentence that only uses an outcome verb", () => {
    const goal = analyzeTranscript("At my last job our checkout was slow. My goal was to cut the p99 latency before launch.", 20_000);
    expect(goal.star.result.present).toBe(false); // core skips outcome verbs inside the Task sentence
    expect(liveStar(goal.star).result).toEqual({ present: false, evidence: null });
    // liveStar still guards the same false positive on a Situation sentence.
    const situation = analyzeTranscript("Last year we cut the deploy pipeline over to a new cluster. I profiled it.", 20_000);
    expect(situation.star.situation.present).toBe(true);
    expect(liveStar(situation.star).result.present).toBe(false);
    expect(liveAnalysis(goal).star.task.present).toBe(true);
  });

  it("keeps real results, including a Task sentence with an explicit outcome phrase", () => {
    const full = analyzeTranscript(STRONG_ANSWER, 60_000);
    expect(liveStar(full.star)).toBe(full.star);
    const both = analyzeTranscript("My goal was to cut latency and as a result it dropped 40%.", 10_000);
    expect(liveStar(both.star).result.present).toBe(both.star.result.present);
  });
});

describe("liveNudge", () => {
  it("opens with a context tip, then coaches toward the next STAR part", () => {
    expect(liveNudge(analyzeTranscript("", 0), 0, "voice").text).toMatch(/context/);
    expect(liveNudge(analyzeTranscript("At my last job we had an outage.", 10_000), 10_000, "voice").text).toMatch(/^Next: What did you own/);
  });

  it("nudges gently past 2:30 and past 2:00 without a result", () => {
    const noResult = analyzeTranscript("At my last job we had an outage and I was on call.", 125_000);
    expect(liveNudge(noResult, 125_000, "voice")).toEqual({ tone: "warning", text: "Two minutes in: land the result now." });
    expect(liveNudge(noResult, 155_000, "voice").text).toMatch(/rambling/);
    const full = analyzeTranscript(STRONG_ANSWER, 155_000);
    expect(liveNudge(full, 155_000, "voice").text).toMatch(/past 2:30/);
  });

  it("flags heavy fillers", () => {
    const text = "um so um basically we um like had a um problem and uh we um fixed it like um basically " + "and then we shipped it to users ".repeat(2);
    const analysis = analyzeTranscript(text, 30_000);
    expect(analysis.fillerRate).toBeGreaterThanOrEqual(6);
    expect(liveNudge(analysis, 30_000, "voice").text).toMatch(/Lots of/);
  });

  it("celebrates a full arc and asks for numbers when missing", () => {
    const full = analyzeTranscript(STRONG_ANSWER, 60_000);
    expect(liveNudge(full, 60_000, "voice").text).toMatch(/Close with what you learned/);
  });
});

describe("durations", () => {
  it("estimates typed answers at 150 wpm and clamps to the API range", () => {
    expect(estimateSpokenMs(150)).toBe(60_000);
    expect(clampDurationMs(10)).toBe(1_000);
    expect(clampDurationMs(99 * 60_000)).toBe(30 * 60_000);
    expect(clampDurationMs(Number.NaN)).toBe(1_000);
  });

  it("counts words like the analyzer", () => {
    expect(countWords("I don't know — it's 40% faster")).toBe(analyzeTranscript("I don't know — it's 40% faster", 1000).wordCount);
  });
});
