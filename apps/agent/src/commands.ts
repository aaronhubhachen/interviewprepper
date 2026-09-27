import { normalizeTapback, parseLegacyTapbackText, type TapbackKind } from "@synapse/core";

export type Command =
  | { type: "help" }
  | { type: "greeting" }
  | { type: "start" }
  | { type: "link"; code: string | null }
  | { type: "more" }
  | { type: "skip" }
  | { type: "hint" }
  | { type: "reveal" }
  | { type: "stats" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "why" };

type SimpleCommand = Exclude<Command, { type: "link" }>["type"];

const PHRASES: Readonly<Record<SimpleCommand, readonly string[]>> = {
  help: ["help", "commands", "command", "menu", "options", "what can you do", "how does this work"],
  greeting: [
    "hi",
    "hey",
    "hello",
    "yo",
    "sup",
    "hiya",
    "howdy",
    "hey there",
    "hi there",
    "good morning",
    "gm",
    "prepr",
    "hey prepr",
    "hi prepr",
    "hello prepr",
    "synapse",
    "hey synapse",
    "hi synapse",
    "hello synapse",
  ],
  start: ["start", "begin", "get started", "lets go", "lets start", "subscribe", "sign me up", "start prepr", "start synapse"],
  more: [
    "more",
    "next",
    "another",
    "another one",
    "one more",
    "next one",
    "next card",
    "new card",
    "more please",
    "next please",
    "give me another",
    "give me another one",
    "quiz me",
    "drill me",
    "card",
    "go",
    "keep going",
  ],
  skip: ["skip", "skip it", "skip this", "skip this one", "skip card", "different card", "something else"],
  hint: ["hint", "hint please", "a hint", "give me a hint", "clue", "nudge", "help me"],
  reveal: [
    "idk",
    "i dont know",
    "dont know",
    "dunno",
    "i dunno",
    "no idea",
    "no clue",
    "reveal",
    "reveal it",
    "show answer",
    "show the answer",
    "show me",
    "answer",
    "tell me",
    "give up",
    "i give up",
    "whats the answer",
    "what is the answer",
  ],
  stats: ["stats", "stat", "status", "progress", "streak", "score", "how am i doing", "my stats"],
  pause: ["pause", "stop", "mute", "snooze", "quiet", "unsubscribe", "stop texting", "leave me alone", "pause texts"],
  resume: ["resume", "unpause", "unmute", "continue", "restart", "im back", "resume texts"],
  why: ["why", "explain", "explain it", "explain that", "explanation", "tell me more", "why is that", "more detail", "details"],
};

const PHRASE_TO_COMMAND = new Map<string, SimpleCommand>(
  (Object.entries(PHRASES) as [SimpleCommand, readonly string[]][]).flatMap(([type, phrases]) =>
    phrases.map((phrase) => [phrase, type] as const),
  ),
);

/**
 * Lowercases, drops apostrophes, turns every other punctuation mark or emoji into
 * a space, and collapses whitespace: "More!! 🙏" → "more", "I don't know." → "i dont know".
 */
export function normalizeCommandText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^(?:hey |ok |okay )?(?:prepr|synapse) /, "");
}

/**
 * Exact-phrase commands only, so a real answer is never mistaken for one.
 * Case-insensitive and tolerant of punctuation, emoji, "/more" slash syntax and
 * a leading "Prepr" (or legacy "Synapse").
 */
export function parseCommand(text: string): Command | undefined {
  const normalized = normalizeCommandText(text);
  if (!normalized) return undefined;
  const link = /^link(?: (.+))?$/.exec(normalized);
  if (link) return { type: "link", code: link[1]?.replace(/\s+/g, "") ?? null };
  const type = PHRASE_TO_COMMAND.get(normalized);
  return type ? ({ type } as Command) : undefined;
}

/**
 * A text that is really a tapback: an emoji-only message ("❤️", "?", "!!") or a
 * tapback relayed as text by a non-Apple device ('Loved "…"').
 */
export function textAsTapback(text: string): TapbackKind | undefined {
  const legacy = parseLegacyTapbackText(text);
  if (legacy) return legacy;
  const trimmed = text.trim();
  if (!trimmed || /[\p{L}\p{N}]/u.test(trimmed)) return undefined;
  return normalizeTapback(trimmed);
}
