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
  | { type: "why" }
  | { type: "grill" }
  | { type: "endGrill" }
  | { type: "report" }
  | { type: "web"; page: WebPage };

/** Web-only features a text can ask about; the agent replies with a deep link. */
export type WebPage = "plans" | "practice" | "design" | "mock" | "behavioral" | "dashboard";

const WEB_PHRASES: Readonly<Record<WebPage, readonly string[]>> = {
  plans: ["blind 75", "blind75", "neetcode", "neetcode 150", "study plan", "study plans"],
  practice: ["practice", "leetcode", "ide", "code", "coding"],
  design: ["design", "system design", "sys design", "whiteboard"],
  mock: ["mock", "mock interview", "mock onsite", "onsite", "mock loop"],
  behavioral: ["behavioral", "spar", "star", "behavioral practice"],
  dashboard: ["dashboard", "web", "website", "site", "app"],
};

const PHRASE_TO_WEB = new Map<string, WebPage>(
  (Object.entries(WEB_PHRASES) as [WebPage, readonly string[]][]).flatMap(([page, phrases]) => phrases.map((phrase) => [phrase, page] as const)),
);

type SimpleCommand = Exclude<Command, { type: "link" } | { type: "web" }>["type"];

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
  // Literal only: "lets go" / "begin" are everyday texts on a shared line, and 'start' signs the texter up for pushes.
  start: ["start", "start prepr", "start synapse"],
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
  grill: ["grill", "grill me", "resume grill", "grill my resume", "roast my resume", "start grill"],
  endGrill: ["end grill", "stop grill", "finish grill", "done grill", "quit grill", "cancel grill", "end the grill"],
  report: ["report", "report card", "weekly report", "weekly", "my week", "week recap", "weekly recap"],
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
 * "link", "link 482193", "link code 482193", "link 482 193". The remainder must be
 * digits, so an answer like "Link the smaller head each step" stays an answer.
 * Wrong-length codes still parse (the controller explains the 6-digit format).
 */
function parseLink(normalized: string): Command | undefined {
  const match = /^link(?: (.+))?$/.exec(normalized);
  if (!match) return undefined;
  if (match[1] === undefined) return { type: "link", code: null };
  const code = match[1].replace(/^code\b/, "").replace(/\s+/g, "");
  if (code === "") return { type: "link", code: null };
  return /^\d{1,12}$/.test(code) ? { type: "link", code } : undefined;
}

/**
 * Exact-phrase commands only, so a real answer is never mistaken for one.
 * Case-insensitive and tolerant of punctuation, emoji, "/more" slash syntax and
 * a leading "prepr" (or the legacy "synapse").
 */
export function parseCommand(text: string): Command | undefined {
  const normalized = normalizeCommandText(text);
  if (!normalized) return undefined;
  const link = parseLink(normalized);
  if (link) return link;
  const type = PHRASE_TO_COMMAND.get(normalized);
  if (type) return { type } as Command;
  const page = PHRASE_TO_WEB.get(normalized);
  return page ? { type: "web", page } : undefined;
}

/**
 * Autocomplete entries for the terminal (tuichat) provider. Its config schema
 * requires names that start with "/"; parseCommand strips the slash.
 */
export const TERMINAL_COMMANDS: readonly { name: `/${string}`; description: string }[] = [
  { name: "/more", description: "Next flashcard" },
  { name: "/hint", description: "A nudge for the open card" },
  { name: "/idk", description: "Reveal the answer" },
  { name: "/skip", description: "Skip the open card" },
  { name: "/why", description: "Explain the last card" },
  { name: "/stats", description: "Your progress" },
  { name: "/grill", description: "Defend your resume, one question at a time" },
  { name: "/report", description: "Your weekly report card" },
  { name: "/help", description: "Everything Prepr can do" },
];

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
