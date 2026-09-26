/** Browser-safe heuristics over a spoken behavioral answer (Web Speech API transcripts rarely have punctuation). */

export interface FillerCount {
  word: string;
  count: number;
}

export interface StarComponent {
  present: boolean;
  /** Short snippet of the transcript that triggered detection. */
  evidence: string | null;
}

export type StarPart = "situation" | "task" | "action" | "result";

export interface TranscriptAnalysis {
  wordCount: number;
  durationMs: number;
  wpm: number;
  fillerCount: number;
  /** Fillers per 100 words. */
  fillerRate: number;
  fillers: FillerCount[];
  iStatements: number;
  weStatements: number;
  /** "I" share of I+we pronouns (0 when neither is used). */
  ownershipRatio: number;
  star: Record<StarPart, StarComponent>;
  hasMetrics: boolean;
  metrics: string[];
  tradeoffMentions: number;
  /** Distinct technical terms used. */
  technicalTerms: number;
  longestSentenceWords: number;
  rambleFlags: string[];
}

export interface SparScores {
  conciseness: number;
  star: number;
  ownership: number;
  technicalDepth: number;
  impact: number;
  clarity: number;
}

export type SparAxis = keyof SparScores;

export const SPAR_AXES: ReadonlyArray<{ key: SparAxis; label: string }> = [
  { key: "star", label: "STAR structure" },
  { key: "ownership", label: "Ownership" },
  { key: "impact", label: "Impact" },
  { key: "technicalDepth", label: "Technical depth" },
  { key: "conciseness", label: "Conciseness" },
  { key: "clarity", label: "Clarity" },
];

const SINGLE_FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "er", "erm", "hmm", "basically", "actually", "literally"]);

/** Two-word fillers, each with preceding words that make the phrase literal ("what kind of"). */
const PHRASE_FILLERS: ReadonlyArray<{ phrase: [string, string]; literalAfter: ReadonlySet<string> }> = [
  { phrase: ["you", "know"], literalAfter: new Set(["do", "did", "if", "dont", "would", "to"]) },
  { phrase: ["i", "mean"], literalAfter: new Set(["what"]) },
  { phrase: ["kind", "of"], literalAfter: new Set(["what", "the", "a", "this", "that", "some", "any", "which", "same", "one"]) },
  { phrase: ["sort", "of"], literalAfter: new Set(["what", "the", "a", "this", "that", "some", "any", "which", "same", "one"]) },
];

/** "like" is literal after these ("I like", "looks like", "something like"). */
const LITERAL_LIKE_AFTER = new Set([
  "i", "you", "we", "they", "he", "she", "would", "id", "youd", "wed", "theyd", "looks", "look", "looked",
  "feel", "feels", "felt", "seem", "seems", "seemed", "sounds", "sound", "something", "anything", "nothing",
  "things", "stuff", "dont", "didnt", "doesnt", "not", "really", "just", "more", "much", "exactly",
]);

const I_WORDS = new Set(["i", "im", "ive", "id", "ill", "my", "me", "myself", "mine"]);
// "we're"/"we'll" are skipped: without apostrophes they collide with "were"/"well".
const WE_WORDS = new Set(["we", "weve", "our", "us", "ourselves", "ours"]);

const STAR_CUES: Readonly<Record<StarPart, RegExp>> = {
  situation:
    /\b(when i was|while i was|at my (last |previous |current |first )?(job|company|internship|team|role|startup)|last (year|summer|semester|quarter|spring|fall)|during my|our team|my team|the situation|the context|for context|background|we were|i was working|i was an? |i was on|at (google|meta|amazon|microsoft|apple|a startup))/,
  task: /\b(my (goal|task|job|role|responsibility) was|i was (responsible|tasked|asked|assigned|in charge)|i (needed|had) to|the (goal|task|challenge|problem|ask) was|i owned|objective|we needed to|deadline)/,
  action:
    /\bi (decided|built|implemented|wrote|designed|led|proposed|created|set up|organized|reached out|refactored|analyzed|debugged|investigated|scheduled|talked|met|started|introduced|migrated|added|automated|profiled|rewrote|pushed|drove|convinced|prototyped|benchmarked|documented|split|paired|escalated|rolled back|fixed|shipped|presented|suggested|asked|went)\b/,
  result: /\b(as a result|the result|resulted in|in the end|ultimately|outcome|end result|now we|going forward|since then)\b/,
};

/** Outcome verbs also appear in goals ("my goal was to cut latency"), so they only count from the end. */
const WEAK_RESULT_CUE = /\b(reduced|increased|improved|saved|shipped|launched|cut|dropped|fell|grew|doubled|halved|learned)\b/;

const METRIC_PATTERN =
  /(\$\s?\d[\d,.]*\s?[km]?|\b\d[\d,.]*\s?(%|percent|x\b|times\b|ms\b|milliseconds|seconds|minutes|hours|days|weeks|months|users|customers|requests|queries|engineers|dollars|k\b|million|thousand|hundred)|\b(doubled|tripled|halved)\b)/gi;

const TRADEOFF_PATTERN =
  /\b(trade-?offs?|trade offs?|instead of|on the other hand|downside|at the cost of|versus|vs|pros and cons|we considered|i considered|alternatively|alternative|weighed|compromise)\b/g;

const TECH_TERM_PATTERNS = [
  "api", "database", "sql", "postgres", "redis", "cache", "latency", "throughput", "queue", "kafka", "service",
  "microservice", "scalab", "deploy", "pipeline", "test", "algorithm", "index", "query", "schema", "migration",
  "architecture", "refactor", "concurrency", "async", "thread", "memory", "cpu", "profil", "monitor", "alert",
  "metric", "logging", "kubernetes", "docker", "aws", "gcp", "react", "frontend", "backend", "endpoint",
  "rollback", "feature flag", "load balanc", "shard", "replica", "consisten", "race condition", "regression",
  "performance", "optimiz", "prototype", "benchmark", "design doc", "code review", "on-call", "incident",
].map((term) => new RegExp(`\\b${term}`));

const TANGENT_PATTERN = /\b(anyway|anyways|but yeah|long story short|going back|side note|tangent|where was i)\b/g;

function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9%$]+/)
    .filter(Boolean);
}

function countFillers(words: string[]): FillerCount[] {
  const counts = new Map<string, number>();
  const bump = (word: string) => counts.set(word, (counts.get(word) ?? 0) + 1);
  words.forEach((word, i) => {
    const previous = words[i - 1] ?? "";
    if (SINGLE_FILLERS.has(word)) bump(word);
    else if (word === "like" && !LITERAL_LIKE_AFTER.has(previous)) bump("like");
    for (const { phrase, literalAfter } of PHRASE_FILLERS) {
      if (word === phrase[0] && words[i + 1] === phrase[1] && !literalAfter.has(previous)) bump(phrase.join(" "));
    }
  });
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/** Splits on sentence punctuation; unpunctuated speech is chunked into ~25-word pseudo-sentences. */
function sentencesOf(text: string): { sentences: string[]; punctuated: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { sentences: [], punctuated: false };
  const punctuated = /[.!?]/.test(trimmed);
  if (punctuated) {
    return { sentences: trimmed.split(/(?<=[.!?])\s+/).filter(Boolean), punctuated };
  }
  const raw = trimmed.split(/\s+/);
  const sentences: string[] = [];
  for (let i = 0; i < raw.length; i += 25) sentences.push(raw.slice(i, i + 25).join(" "));
  return { sentences, punctuated };
}

function clip(text: string, maxChars = 140): string {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length <= maxChars ? single : `${single.slice(0, maxChars - 1).trimEnd()}…`;
}

function detectStar(sentences: string[]): Record<StarPart, StarComponent> {
  const normalized = sentences.map((sentence) => sentence.toLowerCase().replace(/['’]/g, ""));
  const component = (index: number): StarComponent =>
    index >= 0 ? { present: true, evidence: clip(sentences[index]!) } : { present: false, evidence: null };
  const first = (cue: RegExp) => normalized.findIndex((sentence) => cue.test(sentence));
  const strongResult = first(STAR_CUES.result);
  return {
    situation: component(first(STAR_CUES.situation)),
    task: component(first(STAR_CUES.task)),
    action: component(first(STAR_CUES.action)),
    // A goal sentence ("my goal was to cut latency") is the Task, not a Result, even with an outcome verb.
    result: component(
      strongResult >= 0
        ? strongResult
        : normalized.findLastIndex((sentence) => WEAK_RESULT_CUE.test(sentence) && !STAR_CUES.task.test(sentence)),
    ),
  };
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export function analyzeTranscript(text: string, durationMs: number): TranscriptAnalysis {
  const words = normalizedWords(text);
  const wordCount = words.length;
  const lower = ` ${text.toLowerCase().replace(/['’]/g, "")} `;
  const { sentences, punctuated } = sentencesOf(text);

  const fillers = countFillers(words);
  const fillerCount = fillers.reduce((sum, filler) => sum + filler.count, 0);
  const iStatements = words.filter((word) => I_WORDS.has(word)).length;
  const weStatements = words.filter((word) => WE_WORDS.has(word)).length;
  const metrics = [...new Set((text.match(METRIC_PATTERN) ?? []).map((metric) => metric.trim()))];
  const star = detectStar(sentences);
  const longestSentenceWords = punctuated
    ? Math.max(0, ...sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length))
    : 0;

  const rambleFlags: string[] = [];
  if (longestSentenceWords > 45) rambleFlags.push(`A ${longestSentenceWords}-word sentence: split it in two.`);
  if (durationMs > 150_000) rambleFlags.push("Over 2.5 minutes: aim for about 2.");
  if (wordCount > 400) rambleFlags.push("Over 400 words: trim the setup.");
  const tangents = countMatches(lower, TANGENT_PATTERN);
  if (tangents >= 2) rambleFlags.push(`${tangents} tangent markers ("anyway", "long story short"): stay on the thread.`);
  const actionAt = lower.search(STAR_CUES.action);
  if (wordCount >= 80 && actionAt > lower.length * 0.55) {
    rambleFlags.push("Your actions start late: get to what you did within the first third.");
  }

  return {
    wordCount,
    durationMs,
    wpm: durationMs > 0 ? Math.round(wordCount / (durationMs / 60_000)) : 0,
    fillerCount,
    fillerRate: wordCount > 0 ? Math.round((fillerCount / wordCount) * 1000) / 10 : 0,
    fillers,
    iStatements,
    weStatements,
    ownershipRatio: iStatements + weStatements > 0 ? Math.round((iStatements / (iStatements + weStatements)) * 100) / 100 : 0,
    star,
    hasMetrics: metrics.length > 0,
    metrics,
    tradeoffMentions: countMatches(lower, TRADEOFF_PATTERN),
    technicalTerms: TECH_TERM_PATTERNS.filter((pattern) => pattern.test(lower)).length,
    longestSentenceWords,
    rambleFlags,
  };
}

function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** Deterministic 0-100 scores per radar axis. */
export function heuristicSparScores(analysis: TranscriptAnalysis): SparScores {
  if (analysis.wordCount === 0) {
    return { conciseness: 0, star: 0, ownership: 0, technicalDepth: 0, impact: 0, clarity: 0 };
  }
  const { wordCount, wpm, star } = analysis;

  const lengthPenalty = wordCount < 150 ? ((150 - wordCount) / 150) * 60 : wordCount > 350 ? (wordCount - 350) / 5 : 0;
  const conciseness = 100 - lengthPenalty - analysis.rambleFlags.length * 12;

  const starScore = (["situation", "task", "action", "result"] as const).filter((part) => star[part].present).length * 25;

  const ownership = analysis.iStatements === 0 ? 15 : 35 + analysis.ownershipRatio * 65;

  const technicalDepth = 25 + analysis.technicalTerms * 9 + analysis.tradeoffMentions * 12;

  const impact = (star.result.present ? 40 : 0) + (analysis.hasMetrics ? 45 : 0) + (analysis.metrics.length >= 2 ? 15 : 0);

  const pacePenalty = analysis.durationMs > 0 ? Math.min(30, Math.max(0, 110 - wpm, wpm - 170) / 2) : 0;
  const clarity = 100 - analysis.fillerRate * 6 - pacePenalty;

  return {
    conciseness: clampScore(conciseness),
    star: clampScore(starScore),
    ownership: clampScore(ownership),
    technicalDepth: clampScore(technicalDepth),
    impact: clampScore(impact),
    clarity: clampScore(clarity),
  };
}

export function overallScore(scores: SparScores): number {
  const values = SPAR_AXES.map((axis) => scores[axis.key]);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
