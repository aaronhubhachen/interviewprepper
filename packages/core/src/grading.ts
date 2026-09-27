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
  tokens: string[];
  stems: string[];
  compact: string;
  /** Start offset of each token inside `compact`. */
  offsets: number[];
}

function normalize(text: string): NormalizedText {
  const tokens = words(text);
  const offsets: number[] = [];
  let at = 0;
  for (const token of tokens) {
    offsets.push(at);
    at += token.length;
  }
  return { tokens, stems: tokens.map(stem), compact: tokens.join(""), offsets };
}

/** A mention of a key-point phrase: answer tokens [start, end). */
interface Span {
  start: number;
  end: number;
  /** The phrase itself contains a negator ("not crossed"), so it is taken literally. */
  literal?: boolean;
}

/**
 * Words that flip the meaning of what follows ("not greedy", "you should never use a heap").
 * "no"/"without" are left out: "no negative edges" is usually the right claim.
 */
const NEGATORS = new Set([
  "not", "never", "nothing", "dont", "doesnt", "didnt", "isnt", "arent", "wasnt", "werent", "cant", "cannot", "wont", "shouldnt",
  "wouldnt", "neednt",
]);
/** Filler that may sit between a negator and the phrase it negates ("not use a hash map", "never really finalized"). */
const NEGATION_BRIDGE = new Set([
  "a", "an", "the", "be", "is", "are", "was", "been", "use", "using", "need", "needed", "to", "any", "ever", "really", "even", "just", "so", "very", "it", "its", "get", "have", "do",
]);

/** True when a negator comes right before token `start` (up to 3 tokens back, only bridge words in between). */
function negatedFrom(answer: NormalizedText, start: number): boolean {
  for (let i = start - 1; i >= Math.max(0, start - 3); i--) {
    const token = answer.tokens[i]!;
    if (NEGATORS.has(token)) return true;
    if (!NEGATION_BRIDGE.has(token)) return false;
  }
  return false;
}

const MAX_SPANS_PER_PHRASE = 6;

/**
 * Every mention of the phrase: a word-sequence match after stemming, and for
 * symbolic phrases ("mask | (1 << j)", "2^n * n^2") a match on the
 * punctuation-free compact form.
 */
function phraseSpans(answer: NormalizedText, phrase: string): Span[] {
  const target = normalize(phrase);
  const spans: Span[] = [];
  const needle = target.stems;
  if (needle.length > 0) {
    outer: for (let i = 0; i + needle.length <= answer.stems.length && spans.length < MAX_SPANS_PER_PHRASE; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (answer.stems[i + j] !== needle[j]) continue outer;
      }
      spans.push({ start: i, end: i + needle.length });
    }
  }
  const symbolic = /[^a-z0-9\s'’-]/i.test(phrase);
  if (symbolic && target.compact.length >= 4) {
    for (let at = answer.compact.indexOf(target.compact); at >= 0 && spans.length < MAX_SPANS_PER_PHRASE; ) {
      const endChar = at + target.compact.length;
      const covered = answer.offsets.flatMap((offset, index) =>
        offset < endChar && offset + answer.tokens[index]!.length > at ? [index] : [],
      );
      if (covered.length > 0) spans.push({ start: covered[0]!, end: covered[covered.length - 1]! + 1 });
      at = answer.compact.indexOf(target.compact, at + 1);
    }
  }
  const literal = target.tokens.some((token) => NEGATORS.has(token));
  return literal ? spans.map((span) => ({ ...span, literal })) : spans;
}

/**
 * Drops negated mentions ("you should not use a hash map"). Negation is read
 * from the start of the longest mention that contains the span, so "map"
 * inside a negated "hash map" is negated too.
 */
function withoutNegated(answer: NormalizedText, candidates: Span[][]): Span[][] {
  const all = candidates.flat();
  return candidates.map((spans) =>
    spans.filter((span) => {
      if (span.literal) return true;
      const start = Math.min(...all.filter((other) => other.start <= span.start && other.end >= span.end).map((other) => other.start));
      return !negatedFrom(answer, start);
    }),
  );
}

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Credits each key point with a mention that no other key point uses, maximizing
 * the points covered, so one phrase ("still valid") can't satisfy two key points
 * and one keyword can't be stuffed in for several.
 */
function assignMentions(candidates: Span[][]): boolean[] {
  let best: boolean[] = candidates.map(() => false);
  let bestCount = -1;
  const chosen: (Span | null)[] = [];
  const search = (index: number, count: number): void => {
    if (count + (candidates.length - index) <= bestCount) return;
    if (index === candidates.length) {
      bestCount = count;
      best = chosen.map((span) => span !== null);
      return;
    }
    for (const span of candidates[index]!) {
      if (chosen.some((other) => other !== null && overlaps(other, span))) continue;
      chosen.push(span);
      search(index + 1, count + 1);
      chosen.pop();
      if (bestCount === candidates.length) return;
    }
    chosen.push(null);
    search(index + 1, count);
    chosen.pop();
  };
  search(0, 0);
  return best;
}

export function matchKeyPoints(answer: string, keyPoints: KeyPoint[]): { nailed: string[]; missed: string[] } {
  const normalized = normalize(answer);
  const mentions = keyPoints.map((point) => point.anyOf.flatMap((phrase) => phraseSpans(normalized, phrase)));
  const hits = assignMentions(withoutNegated(normalized, mentions));
  const nailed: string[] = [];
  const missed: string[] = [];
  keyPoints.forEach((point, index) => (hits[index] ? nailed : missed).push(point.label));
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
