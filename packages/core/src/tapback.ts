import { RATING_GRADES, type Grade, type IntervalPreview, type Rating } from "./sm2";

export type TapbackKind = "love" | "like" | "dislike" | "emphasize" | "question" | "laugh";

export const TAPBACK_EMOJI: Readonly<Record<TapbackKind, string>> = {
  love: "❤️",
  like: "👍",
  dislike: "👎",
  emphasize: "‼️",
  question: "❓",
  laugh: "😂",
};

const EMOJI_KINDS: ReadonlyArray<readonly [TapbackKind, readonly string[]]> = [
  ["love", ["❤", "♥", "💖", "💗", "💓", "💕", "💞", "💘", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "😍", "🥰", "😻"]],
  ["like", ["👍", "👌", "✅"]],
  ["dislike", ["👎", "❌"]],
  ["emphasize", ["‼", "❗", "❕", "⁉"]],
  ["question", ["❓", "❔", "?", "🤔"]],
  ["laugh", ["😂", "🤣", "😆", "😹"]],
];

const EMOJI_TO_KIND = new Map<string, TapbackKind>(
  EMOJI_KINDS.flatMap(([kind, emojis]) => emojis.map((emoji) => [emoji, kind] as const)),
);

const NAME_TO_KIND: Readonly<Record<string, TapbackKind>> = {
  love: "love",
  loved: "love",
  heart: "love",
  like: "like",
  liked: "like",
  thumbsup: "like",
  "+1": "like",
  dislike: "dislike",
  disliked: "dislike",
  thumbsdown: "dislike",
  "-1": "dislike",
  emphasize: "emphasize",
  emphasized: "emphasize",
  emphasis: "emphasize",
  exclamation: "emphasize",
  "!!": "emphasize",
  question: "question",
  questioned: "question",
  laugh: "laugh",
  laughed: "laugh",
  laughedat: "laugh",
  haha: "laugh",
};

// Variation selectors (U+FE0E/U+FE0F) and Fitzpatrick skin-tone modifiers carry no tapback meaning.
const PRESENTATION_MARKS = /[︎️\u{1F3FB}-\u{1F3FF}]/gu;

function normalizeName(value: string): string {
  const lower = value.trim().toLowerCase();
  return lower === "+1" || lower === "-1" ? lower : lower.replace(/[\s_-]+/g, "");
}

/** Maps a tapback emoji ("❤️", "❤", "👍🏽") or name ("love", "Liked", "thumbs_up") to its kind. */
export function normalizeTapback(input: string | null | undefined): TapbackKind | undefined {
  if (!input) return undefined;
  const bare = input.replace(PRESENTATION_MARKS, "").trim();
  if (!bare) return undefined;
  const exact = EMOJI_TO_KIND.get(bare);
  if (exact) return exact;
  // Pure-emoji sequences such as ❤️‍🔥 resolve by their leading emoji; text never does.
  if (!/[\p{L}\p{N}\s]/u.test(bare)) {
    const leading = EMOJI_TO_KIND.get(Array.from(bare)[0]!);
    if (leading) return leading;
  }
  return NAME_TO_KIND[normalizeName(bare)];
}

const LEGACY_VERB_KIND: Readonly<Record<string, TapbackKind>> = {
  loved: "love",
  liked: "like",
  disliked: "dislike",
  emphasized: "emphasize",
  questioned: "question",
  "laughed at": "laugh",
};

/**
 * Tapbacks that arrive as plain text from non-iMessage devices:
 * 'Loved “What is…”' or 'Reacted 👍 to “What is…”'.
 */
export function parseLegacyTapbackText(text: string): TapbackKind | undefined {
  const verb = /^(loved|liked|disliked|emphasized|questioned|laughed at)\s+[“"]/i.exec(text.trim());
  if (verb) return LEGACY_VERB_KIND[verb[1]!.toLowerCase()];
  const reacted = /^reacted\s+(\S+)\s+to\s+[“"]/i.exec(text.trim());
  return reacted ? normalizeTapback(reacted[1]) : undefined;
}

export function isRating(kind: TapbackKind | undefined): kind is Rating {
  return kind === "love" || kind === "like" || kind === "dislike";
}

/** ❤️ → 5, 👍 → 3, 👎 → 1; ❓/‼️/😂 are actions, not grades. */
export function tapbackToGrade(kind: TapbackKind | undefined): Grade | undefined {
  return isRating(kind) ? RATING_GRADES[kind] : undefined;
}

export type TextGrade = 1 | 3 | 5;

const TEXT_GRADES: Readonly<Record<string, TextGrade>> = {
  easy: 5,
  effortless: 5,
  "3": 5,
  good: 3,
  ok: 3,
  okay: 3,
  hesitant: 3,
  hard: 3,
  "2": 3,
  again: 1,
  guessed: 1,
  guess: 1,
  blank: 1,
  "1": 1,
};

/**
 * Grades a whole-message text reply ("easy", "3", "ok!", "❤️", "👎").
 * Only exact replies count, so a real answer is never mistaken for a rating.
 */
export function parseTextGrade(text: string | null | undefined): TextGrade | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(PRESENTATION_MARKS, "")
    .trim()
    .toLowerCase()
    .replace(/^[\s"'“”.,!]+|[\s"'“”.,!]+$/g, "");
  if (!cleaned) return undefined;
  const direct = TEXT_GRADES[cleaned];
  if (direct) return direct;
  const grade = tapbackToGrade(normalizeTapback(cleaned));
  return grade === undefined ? undefined : (grade as TextGrade);
}

export interface RatingOption {
  rating: Rating;
  emoji: string;
  label: string;
  grade: Grade;
}

export const TAPBACK_LEGEND: readonly RatingOption[] = [
  { rating: "love", emoji: TAPBACK_EMOJI.love, label: "Effortless", grade: RATING_GRADES.love },
  { rating: "like", emoji: TAPBACK_EMOJI.like, label: "Hesitant", grade: RATING_GRADES.like },
  { rating: "dislike", emoji: TAPBACK_EMOJI.dislike, label: "Guessed/blank", grade: RATING_GRADES.dislike },
];

/** ["❤️ Effortless → 4d", "👍 Hesitant → 1d", "👎 Guessed/blank → 10m"] */
export function legendLines(preview: Record<Rating, IntervalPreview>): string[] {
  return TAPBACK_LEGEND.map((option) => `${option.emoji} ${option.label} → ${preview[option.rating].label}`);
}

/** "❤️ 4d · 👍 1d · 👎 10m" */
export function compactLegend(preview: Record<Rating, IntervalPreview>): string {
  return TAPBACK_LEGEND.map((option) => `${option.emoji} ${preview[option.rating].label}`).join(" · ");
}
