/**
 * Splits a transcript into plain and filler segments for live highlighting.
 *
 * Mirrors the filler rules in core's analyzeTranscript (packages/core/src/transcript.ts),
 * which only exposes counts, not positions. The tokenizer is position-preserving but
 * yields exactly core's word list, and fillers.test.ts asserts that the number of
 * highlighted fillers equals analyzeTranscript(text).fillerCount, so the two stay in sync.
 */

export interface TranscriptSegment {
  text: string;
  /** Normalized filler ("um", "you know") when this segment is a filler. */
  filler: string | null;
}

const SINGLE_FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "er", "erm", "hmm", "basically", "actually", "literally"]);

const PHRASE_FILLERS: ReadonlyArray<{ phrase: readonly [string, string]; literalAfter: ReadonlySet<string> }> = [
  { phrase: ["you", "know"], literalAfter: new Set(["do", "did", "if", "dont", "would", "to"]) },
  { phrase: ["i", "mean"], literalAfter: new Set(["what"]) },
  { phrase: ["kind", "of"], literalAfter: new Set(["what", "the", "a", "this", "that", "some", "any", "which", "same", "one"]) },
  { phrase: ["sort", "of"], literalAfter: new Set(["what", "the", "a", "this", "that", "some", "any", "which", "same", "one"]) },
];

const LITERAL_LIKE_AFTER = new Set([
  "i", "you", "we", "they", "he", "she", "would", "id", "youd", "wed", "theyd", "looks", "look", "looked",
  "feel", "feels", "felt", "seem", "seems", "seemed", "sounds", "sound", "something", "anything", "nothing",
  "things", "stuff", "dont", "didnt", "doesnt", "not", "really", "just", "more", "much", "exactly",
]);

interface Token {
  word: string;
  start: number;
  end: number;
}

/** Same words as core's normalizedWords(), with source offsets. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/[a-z0-9%$'’]+/gi)) {
    const word = match[0].toLowerCase().replace(/['’]/g, "");
    if (!word) continue;
    tokens.push({ word, start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/** Filler spans as [firstTokenIndex, lastTokenIndex, normalized filler]. */
function fillerSpans(tokens: readonly Token[]): Array<[number, number, string]> {
  const spans: Array<[number, number, string]> = [];
  tokens.forEach((token, i) => {
    const previous = tokens[i - 1]?.word ?? "";
    if (SINGLE_FILLERS.has(token.word)) spans.push([i, i, token.word]);
    else if (token.word === "like" && !LITERAL_LIKE_AFTER.has(previous)) spans.push([i, i, "like"]);
    for (const { phrase, literalAfter } of PHRASE_FILLERS) {
      if (token.word === phrase[0] && tokens[i + 1]?.word === phrase[1] && !literalAfter.has(previous)) {
        spans.push([i, i + 1, phrase.join(" ")]);
      }
    }
  });
  return spans;
}

/** Plain / filler segments covering the whole input (concatenated segment text === input). */
export function segmentFillers(text: string): TranscriptSegment[] {
  if (!text) return [];
  const tokens = tokenize(text);
  const segments: TranscriptSegment[] = [];
  let cursor = 0;
  let lastToken = -1;
  for (const [first, last, filler] of fillerSpans(tokens)) {
    if (first <= lastToken) continue; // never overlap (core's rules cannot produce overlaps; be defensive)
    const start = tokens[first]!.start;
    const end = tokens[last]!.end;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), filler: null });
    segments.push({ text: text.slice(start, end), filler });
    cursor = end;
    lastToken = last;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), filler: null });
  return segments;
}

export function countFillerSegments(segments: readonly TranscriptSegment[]): number {
  return segments.reduce((count, segment) => count + (segment.filler ? 1 : 0), 0);
}
