import { describe, expect, it } from "vitest";
import {
  DESIGN_PHASES,
  DESIGN_PROMPTS,
  describeDiagram,
  evaluateDesign,
  getDesignPrompt,
  heuristicNextDesignQuestion,
  missingComponents,
  nextDesignQuestion,
  type DesignDiagram,
  type DesignSessionInput,
} from "../src/design";

const prompt = getDesignPrompt("sd-url-shortener")!;
const diagram: DesignDiagram = {
  nodes: [
    { id: "c", kind: "client", label: "Browser", x: 50, y: 300 },
    { id: "lb", kind: "load_balancer", label: "LB", x: 250, y: 300 },
    { id: "api", kind: "api", label: "Shortener API", x: 450, y: 300 },
    { id: "db", kind: "database", label: "Links DB", x: 700, y: 300 },
  ],
  edges: [
    { from: "c", to: "lb", label: "HTTPS" },
    { from: "lb", to: "api", label: "" },
    { from: "api", to: "db", label: "read/write" },
  ],
};

const strong: DesignSessionInput = {
  prompt,
  diagram,
  notes: "POST /links {url} -> {code}; GET /{code} -> 301. Table links(code primary key, url, created_at).",
  turns: [
    { phase: "requirements", question: "Scope?", answer: "Shorten and redirect. 100M new links per month is about 40 writes per second, and at 100:1 reads that is 4000 reads per second, peaking maybe 10k. Five years of links is 6 billion rows at 500 bytes, so 3 TB." },
    { phase: "api", question: "API?", answer: "POST /links with the long url returns the code; GET /{code} returns a 301. The table is keyed by code as the primary key with the url and created_at, partition key is the code." },
    { phase: "high_level", question: "Flow?", answer: "The client hits the load balancer, which spreads requests across stateless API servers. Reads check a Redis cache first, then the database. I chose a key-value store rather than Postgres because access is by key only; the trade-off is weaker ad hoc queries." },
  ],
};

describe("system design", () => {
  it("has well-formed prompts", () => {
    expect(new Set(DESIGN_PROMPTS.map((p) => p.id)).size).toBe(DESIGN_PROMPTS.length);
    for (const p of DESIGN_PROMPTS) {
      expect(p.id).toMatch(/^sd-[a-z0-9-]+$/);
      expect(p.requirements.length).toBeGreaterThanOrEqual(3);
      expect(p.deepDives.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("describes the whiteboard and spots missing components", () => {
    expect(describeDiagram({ nodes: [], edges: [] })).toBe("The whiteboard is empty.");
    const text = describeDiagram(diagram);
    expect(text).toContain("Shortener API (API server) → Links DB (Database): read/write");
    expect(missingComponents(prompt, diagram)).toEqual(["cache"]);
  });

  it("walks the phases and reacts to the board", () => {
    const first = heuristicNextDesignQuestion({ ...strong, turns: [] });
    expect(first).toMatchObject({ phase: "requirements", reaction: "" });
    const scale = heuristicNextDesignQuestion({ ...strong, turns: [...strong.turns, strong.turns[0]!] });
    expect(scale.phase).toBe("scale");
    expect(scale.question).toMatch(/cache/i);
    const isolated = heuristicNextDesignQuestion({
      ...strong,
      diagram: { ...diagram, nodes: [...diagram.nodes, { id: "q", kind: "queue", label: "Kafka", x: 1, y: 1 }] },
    });
    expect(isolated.reaction).toContain("Kafka");
    expect(heuristicNextDesignQuestion({ ...strong, turns: Array(10).fill(strong.turns[0]) }).phase).toBe(DESIGN_PHASES.at(-1));
  });

  it("scores a concrete design above a vague one", async () => {
    const good = await evaluateDesign(strong, { useLlm: false });
    const vague = await evaluateDesign(
      { prompt, diagram: { nodes: [], edges: [] }, notes: "", turns: [{ phase: "requirements", question: "Scope?", answer: "It should be fast and scale." }] },
      { useLlm: false },
    );
    expect(good.dimensions).toHaveLength(6);
    expect(good.overall).toBeGreaterThan(vague.overall);
    expect(vague.gaps.length).toBeGreaterThan(0);
    expect(good.source).toBe("heuristic");
  });

  it("falls back to heuristics without an LLM", async () => {
    const question = await nextDesignQuestion({ ...strong, turns: [] }, { useLlm: false });
    expect(question.source).toBe("heuristic");
  });
});
