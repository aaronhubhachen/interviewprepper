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
  /** hyphenAfter[i]: tokens i and i + 1 were written as one hyphenated word ("row-col", "in-degree"). */
  hyphenAfter: boolean[];
  /** Tokens plus grouping and operator symbols, no spaces: "(E + V) log V" → "(eplusv)logv". */
  grouped: string;
  /** Token index of each character of `grouped` (-1 for a symbol). */
  groupedTokens: number[];
}

/**
 * Operators carry meaning ("n + 1" is not "n - 1", "nums[i-1]" is not "nums[i+1]"),
 * so they become words before tokenizing. "+" is always "plus". "-" is "minus"
 * only where it reads as arithmetic: spaced ("r - c"), before a digit ("n-1", "-1"),
 * next to a bracket ("dp[i]-dp[j]"), or between single letters ("r-c"). Every other
 * hyphen still joins words ("in-degree", "off-by-one", "0-indexed").
 */
const ARITHMETIC_MINUS = /[ \t]-(?=[ \t])|-(?=\d)|(?<=[\])])-|-(?=[[(])|(?<![a-z0-9])(?<=[a-z])-(?=[a-z](?![a-z0-9]))/g;

function spellOperators(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\+/g, " plus ")
    .replace(ARITHMETIC_MINUS, " minus ");
}

/** Symbols kept in `grouped`, where parentheses decide meaning: (E + V) log V vs E + V log V. */
const GROUPED_SYMBOLS = new Set(["(", ")", "[", "]", "*", "/", "^", "&", "|", "<", ">", "="]);

function normalize(text: string): NormalizedText {
  const spelled = spellOperators(text);
  const tokens: string[] = [];
  const hyphenAfter: boolean[] = [];
  let grouped = "";
  const groupedTokens: number[] = [];
  for (const match of spelled.matchAll(/[a-z0-9]+|[^a-z0-9]+/g)) {
    const piece = match[0];
    if (/^[a-z0-9]/.test(piece)) {
      tokens.push(piece);
      hyphenAfter.push(false);
      grouped += piece;
      for (let i = 0; i < piece.length; i++) groupedTokens.push(tokens.length - 1);
      continue;
    }
    if (piece === "-" && tokens.length > 0) hyphenAfter[tokens.length - 1] = true;
    for (const char of piece) {
      if (!GROUPED_SYMBOLS.has(char)) continue;
      grouped += char;
      groupedTokens.push(-1);
    }
  }
  const offsets: number[] = [];
  let at = 0;
  for (const token of tokens) {
    offsets.push(at);
    at += token.length;
  }
  return { tokens, stems: tokens.map(stem), compact: tokens.join(""), offsets, hyphenAfter, grouped, groupedTokens };
}

/** A phrase whose parentheses wrap an operator ("(v + e) log v", "(sub - 1) & mask"): grouping is part of its meaning. */
function isGroupedPhrase(phrase: string): boolean {
  return /\([^()]*(?:\bplus\b|\bminus\b|[*/^&|])[^()]*\)/.test(spellOperators(phrase));
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

/** Two-word negators ("mark on pop rather than on push", "instead of a heap"). */
const NEGATOR_PAIRS = new Set(["rather than", "instead of"]);

/** True when a negator comes right before token `start` (up to 3 tokens back, only bridge words in between). */
function negatedFrom(answer: NormalizedText, start: number): boolean {
  for (let i = start - 1; i >= Math.max(0, start - 3); i--) {
    const token = answer.tokens[i]!;
    if (NEGATORS.has(token)) return true;
    if (i > 0 && NEGATOR_PAIRS.has(`${answer.tokens[i - 1]} ${token}`)) return true;
    if (!NEGATION_BRIDGE.has(token)) return false;
  }
  return false;
}

const MAX_SPANS_PER_PHRASE = 6;

/**
 * End of a stemmed word-sequence match of `target` starting at answer token
 * `start`, or null. A spaced minus on one side and a hyphen join on the other
 * ("row - col" vs "row-col") read the same.
 */
function matchAt(answer: NormalizedText, target: NormalizedText, start: number): number | null {
  let a = start;
  let t = 0;
  while (t < target.stems.length) {
    if (a < answer.stems.length && answer.stems[a] === target.stems[t]) {
      a++;
      t++;
    } else if (target.tokens[t] === "minus" && t > 0 && a > start && answer.hyphenAfter[a - 1]) {
      t++;
    } else if (answer.tokens[a] === "minus" && t > 0 && a > start && target.hyphenAfter[t - 1]) {
      a++;
    } else {
      return null;
    }
  }
  return a;
}

/**
 * Every mention of the phrase: a word-sequence match after stemming, and for
 * symbolic phrases ("mask | (1 << j)", "2^n * n^2") a match on the
 * punctuation-free compact form. A phrase whose parentheses wrap an operator
 * matches only with the same grouping, so "(e + v) log v" rejects "E + V log V".
 */
function phraseSpans(answer: NormalizedText, phrase: string): Span[] {
  const target = normalize(phrase);
  const literal = target.tokens.some((token) => NEGATORS.has(token));
  const spans = isGroupedPhrase(phrase) ? groupedSpans(answer, target) : looseSpans(answer, target, phrase);
  return literal ? spans.map((span) => ({ ...span, literal })) : spans;
}

function groupedSpans(answer: NormalizedText, target: NormalizedText): Span[] {
  const spans: Span[] = [];
  const needle = target.grouped;
  for (let at = answer.grouped.indexOf(needle); at >= 0 && spans.length < MAX_SPANS_PER_PHRASE; at = answer.grouped.indexOf(needle, at + 1)) {
    const covered = answer.groupedTokens.slice(at, at + needle.length).filter((index) => index >= 0);
    if (covered.length > 0) spans.push({ start: covered[0]!, end: covered[covered.length - 1]! + 1 });
  }
  return spans;
}

function looseSpans(answer: NormalizedText, target: NormalizedText, phrase: string): Span[] {
  const spans: Span[] = [];
  if (target.stems.length > 0) {
    for (let i = 0; i < answer.stems.length && spans.length < MAX_SPANS_PER_PHRASE; i++) {
      const end = matchAt(answer, target, i);
      if (end !== null) spans.push({ start: i, end });
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
  return spans;
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
