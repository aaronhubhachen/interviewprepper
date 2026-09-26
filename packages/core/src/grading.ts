/** Deterministic, browser-safe answer grading against key points (the LLM fallback). */
import type { KeyPoint } from "./content/types";
import type { TextGrade } from "./tapback";

export type Verdict = "correct" | "partial" | "incorrect";

export interface EvaluationInput {
  question: string;
  answerKey: string;
  keyPoints: KeyPoint[];
  answer: string;
}

export interface Evaluation {
  verdict: Verdict;
  /** Key point labels the answer covered. */
  nailed: string[];
  missed: string[];
  /** At most two short plain-text sentences, iMessage-safe. */
  feedback: string;
  suggestedGrade: TextGrade;
  source: "llm" | "heuristic";
}

export const VERDICT_EMOJI: Readonly<Record<Verdict, string>> = {
  correct: "✅",
  partial: "🟡",
  incorrect: "❌",
};

export const VERDICT_GRADE: Readonly<Record<Verdict, TextGrade>> = { correct: 5, partial: 3, incorrect: 1 };

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const STEM_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/ies$/, "y"],
  [/ing$/, ""],
  [/ed$/, ""],
  [/(s|x|z|ch|sh)es$/, "$1"],
  [/([^s])s$/, "$1"],
  [/e$/, ""],
];

/** Crude suffix stripping so "shrinking"/"shrinks"/"shrink" and "decrease"/"decreasing" compare equal. */
export function stem(word: string): string {
  let current = word;
  for (let pass = 0; pass < 2; pass++) {
    if (current.length <= 3) break;
    const rule = STEM_RULES.find(([pattern]) => pattern.test(current));
    if (!rule) break;
    current = current.replace(rule[0], rule[1]);
  }
  return current;
}

interface NormalizedText {
  stems: string[];
  compact: string;
}

function normalize(text: string): NormalizedText {
  const tokens = words(text);
  return { stems: tokens.map(stem), compact: tokens.join("") };
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Word-sequence match after stemming. Symbolic phrases ("mask | (1 << j)",
 * "2^n * n^2") also match on their punctuation-free compact form.
 */
function mentionsPhrase(answer: NormalizedText, phrase: string): boolean {
  const target = normalize(phrase);
  if (containsSequence(answer.stems, target.stems)) return true;
  const symbolic = /[^a-z0-9\s'’-]/i.test(phrase);
  return symbolic && target.compact.length >= 4 && answer.compact.includes(target.compact);
}

export function matchKeyPoints(answer: string, keyPoints: KeyPoint[]): { nailed: string[]; missed: string[] } {
  const normalized = normalize(answer);
  const nailed: string[] = [];
  const missed: string[] = [];
  for (const point of keyPoints) {
    const hit = point.anyOf.some((phrase) => mentionsPhrase(normalized, phrase));
    (hit ? nailed : missed).push(point.label);
  }
  return { nailed, missed };
}

const NON_ANSWERS = new Set([
  "",
  "idk",
  "idek",
  "dunno",
  "i dunno",
  "no idea",
  "i have no idea",
  "no clue",
  "i have no clue",
  "not sure",
  "im not sure",
  "unsure",
  "i dont know",
  "dont know",
  "i do not know",
  "i forgot",
  "forgot",
  "blank",
  "pass",
  "skip",
  "nothing",
  "no",
  "nope",
  "help",
]);

const FILLER_WORDS = new Set(["um", "uh", "hmm", "honestly", "tbh", "sorry", "lol", "really", "just", "man", "bro", "haha"]);

/** "idk", "no idea tbh", "?", or empty. */
export function isNonAnswer(answer: string): boolean {
  const content = words(answer).filter((word) => !FILLER_WORDS.has(word));
  return NON_ANSWERS.has(content.join(" "));
}

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s+/)[0] ?? text;
}

function describeMore(count: number): string {
  return count > 0 ? ` (+${count} more)` : "";
}

const CORRECT_RATIO = 0.75;

export function heuristicEvaluation(input: EvaluationInput): Evaluation {
  const allLabels = input.keyPoints.map((point) => point.label);
  if (isNonAnswer(input.answer)) {
    return {
      verdict: "incorrect",
      nailed: [],
      missed: allLabels,
      feedback: `No stress, here's the key idea: ${input.answerKey}`,
      suggestedGrade: 1,
      source: "heuristic",
    };
  }

  const { nailed, missed } = matchKeyPoints(input.answer, input.keyPoints);
  const ratio = allLabels.length === 0 ? 0 : nailed.length / allLabels.length;
  const verdict: Verdict = ratio >= CORRECT_RATIO ? "correct" : nailed.length > 0 ? "partial" : "incorrect";

  let feedback: string;
  if (verdict === "correct") {
    feedback =
      missed.length === 0
        ? `Nailed it: you covered all ${nailed.length} key points.`
        : `Solid. One gap to tighten: ${missed[0]}.`;
  } else if (verdict === "partial") {
    feedback = `You got ${nailed[0]}${describeMore(nailed.length - 1)}. Missing: ${missed[0]}${describeMore(missed.length - 1)}.`;
  } else {
    feedback = `Not quite. Key idea: ${firstSentence(input.answerKey)}`;
  }

  return { verdict, nailed, missed, feedback, suggestedGrade: VERDICT_GRADE[verdict], source: "heuristic" };
}
