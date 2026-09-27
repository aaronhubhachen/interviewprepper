import { describe, expect, it } from "vitest";
import {
  evaluateGrill,
  extractResumeClaims,
  heuristicNextQuestion,
  heuristicReport,
  nextGrillQuestion,
  type GrillTurn,
} from "../src/grill";

const RESUME = `Jordan Lee
jordan@example.com | github.com/jlee
EXPERIENCE
Software Engineer Intern, Acme Payments (Summer 2025)
- Led migration of the checkout service from a monolith to 4 microservices, cutt
ing p99 latency by 45%
- Wrote integration tests with Jest and improved CI reliability for the team
PROJECTS
- Architected a real-time collaborative notes app with WebSockets and Postgres
- Implemented a CRDT-based sync engine to resolve offline edits without conflicts
SKILLS
Python, TypeScript, Go, React`;

const STRONG =
  "I owned the pricing service split. I profiled the monolith with pprof, found the checkout path spent 300 ms in a shared lock, " +
  "and I moved pricing behind its own gRPC service with a Redis cache. We considered read replicas instead, but the trade-off " +
  "was stale prices. I measured p99 in Datadog over two weeks before and after: 820 ms down to 450 ms, which is the 45% on my resume.";

const turn = (target: string, answer: string, question = "Why?"): GrillTurn => ({ question, target, answer });

describe("extractResumeClaims", () => {
  it("ranks metric-backed, big-verb bullets first and rejoins wrapped lines", () => {
    const claims = extractResumeClaims(RESUME);
    expect(claims[0]).toBe(
      "Led migration of the checkout service from a monolith to 4 microservices, cutt ing p99 latency by 45%",
    );
    expect(claims).toContain("Architected a real-time collaborative notes app with WebSockets and Postgres");
  });

  it("skips contact lines, headers, and short skill lists", () => {
    const claims = extractResumeClaims(RESUME);
    expect(claims.some((claim) => /example\.com|EXPERIENCE|^Python/.test(claim))).toBe(false);
  });
});

describe("heuristicNextQuestion", () => {
  it("opens on the strongest claim and asks how the metric was measured", () => {
    const question = heuristicNextQuestion({ resume: RESUME, turns: [] });
    expect(question.reaction).toBe("");
    expect(question.target).toMatch(/^Led migration/);
    expect(question.question).toMatch(/measure/);
    expect(question.source).toBe("heuristic");
  });

  it("presses on a thin answer, then moves to a new claim after the follow-up", () => {
    const first = heuristicNextQuestion({ resume: RESUME, turns: [] });
    const turns = [turn(first.target, "We just did it and it was faster.")];
    const followUp = heuristicNextQuestion({ resume: RESUME, turns });
    expect(followUp.target).toBe(first.target);
    expect(followUp.reaction).toBe("That was thin.");

    const moved = heuristicNextQuestion({ resume: RESUME, turns: [...turns, turn(first.target, "Still not sure.")] });
    expect(moved.target).not.toBe(first.target);
  });

  it("calls out team-speak", () => {
    const answer =
      "We split the service and we set up the new deploys and we moved traffic over gradually and we monitored the dashboards " +
      "for a couple of weeks until we were confident enough, then we deleted the old code path and we celebrated as a team.";
    const question = heuristicNextQuestion({ resume: RESUME, turns: [turn("Led migration", answer)] });
    expect(question.reaction).toMatch(/we/i);
  });

  it("moves on after a strong answer", () => {
    const question = heuristicNextQuestion({ resume: RESUME, turns: [turn("Led migration of the checkout service", STRONG)] });
    expect(question.target).not.toBe("Led migration of the checkout service");
  });
});

describe("heuristicReport", () => {
  it("grades claims held, shaky, or cracked and scores the session", () => {
    const report = heuristicReport({
      resume: RESUME,
      turns: [
        turn("Led migration", STRONG),
        turn("Architected a notes app", "It used WebSockets. It worked fine."),
      ],
    });
    expect(report.claims.map((claim) => claim.verdict)).toEqual(["held", "cracked"]);
    expect(report.overall).toBe(58);
    expect(report.redFlags.length).toBeGreaterThan(0);
    expect(report.fixes.length).toBeGreaterThan(0);
  });
});

describe("LLM entry points without a key", () => {
  it("fall back to heuristics and never throw", async () => {
    const input = { resume: RESUME, turns: [turn("Led migration", STRONG)] };
    await expect(nextGrillQuestion(input, { useLlm: false })).resolves.toMatchObject({ source: "heuristic" });
    await expect(evaluateGrill(input, { useLlm: false })).resolves.toMatchObject({ source: "heuristic" });
  });
});
