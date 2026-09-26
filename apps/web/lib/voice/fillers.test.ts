import { analyzeTranscript } from "@synapse/core/transcript";
import { describe, expect, it } from "vitest";
import { countFillerSegments, segmentFillers, tokenize } from "./fillers";

const SAMPLES = [
  "",
  "um so basically at my last job we had like a really slow checkout page",
  "I like working with you know the backend team, and do you know what? It was kind of a mess.",
  "Uh, I mean, what kind of cache would you use? I mean we sort of just went with Redis, you know.",
  "It looks like the API was, like, literally timing out. Actually, I don't like that. Umm, hmm.",
  "What I mean is the same kind of issue. Something like 40% of requests failed.",
  "We didn't know, you know? If you know the system, it's sort of obvious. A sort of hack.",
  "rock'n'roll well-known O(1) $5k 3x faster — erm, uhh, UM, Like, LIKE",
  "so like like like um um",
];

describe("segmentFillers", () => {
  it("round-trips the input text exactly", () => {
    for (const sample of SAMPLES) {
      expect(
        segmentFillers(sample)
          .map((segment) => segment.text)
          .join(""),
      ).toBe(sample);
    }
  });

  it("highlights exactly as many fillers as core's analyzeTranscript counts", () => {
    for (const sample of SAMPLES) {
      expect(countFillerSegments(segmentFillers(sample)), sample).toBe(analyzeTranscript(sample, 60_000).fillerCount);
    }
  });

  it("marks single fillers, filler 'like', and two-word phrases", () => {
    const fillers = segmentFillers("Um, we had like a problem, you know, I mean it was kind of bad")
      .filter((segment) => segment.filler)
      .map((segment) => [segment.text, segment.filler]);
    expect(fillers).toEqual([
      ["Um", "um"],
      ["like", "like"],
      ["you know", "you know"],
      ["I mean", "i mean"],
      ["kind of", "kind of"],
    ]);
  });

  it("leaves literal uses alone", () => {
    const text = "I like it. It looks like rain. Do you know him? What kind of cache?";
    expect(segmentFillers(text).every((segment) => segment.filler === null)).toBe(true);
  });

  it("tokenizes the same word list as the core analyzer", () => {
    const text = "Don't stop — it's O(1), $5 or 40%!";
    expect(tokenize(text).map((token) => token.word)).toEqual(["dont", "stop", "its", "o", "1", "$5", "or", "40%"]);
  });
});
