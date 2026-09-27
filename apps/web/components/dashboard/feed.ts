/**
 * Turns store activity events into feed rows (pure, browser-safe). Review
 * events carry { cardId, grade, source, nextLabel }; every other event kind is
 * rendered from its emoji-led title.
 */
import { ACTIVITY_SERIES, isActivitySource } from "./activity-data";

export interface FeedEventLike {
  id: number;
  kind: string;
  title: string;
  detail: Record<string, unknown> | null;
  createdAt: number;
}

export interface FeedRow {
  id: number;
  /** Leading glyph (source icon for reviews). */
  icon: string;
  /** Accessible name for the icon ("via iMessage"). */
  iconLabel: string;
  title: string;
  /** Secondary line: "via iMessage · returns in 4d". */
  detail: string | null;
  /** Tapback for graded reviews. */
  tapback: { emoji: string; label: string } | null;
  /** Deep link (a problem page) when the event has one. */
  href: string | null;
  createdAt: number;
}

const LEADING_EMOJI = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍(?:\p{Extended_Pictographic})️?)*)\s*/u;

/** "🧠 Two Sum → 4d" → { emoji: "🧠", rest: "Two Sum → 4d" }. */
export function splitLeadingEmoji(title: string): { emoji: string | null; rest: string } {
  const match = LEADING_EMOJI.exec(title);
  if (!match) return { emoji: null, rest: title.trim() };
  return { emoji: match[1]!, rest: title.slice(match[0].length).trim() };
}

/** SM-2 grade → the tapback that produces it (❤️ 5, 👍 3-4, 👎 below 3). */
export function tapbackForGrade(grade: number): { emoji: string; label: string } {
  if (grade >= 5) return { emoji: "❤️", label: "Effortless" };
  if (grade >= 3) return { emoji: "👍", label: "Hesitant" };
  return { emoji: "👎", label: "Guessed" };
}

const KIND_ICONS: Record<string, { icon: string; label: string }> = {
  ide_attempt: { icon: "🧩", label: "IDE" },
  weak_flag: { icon: "⚠️", label: "Weak spot" },
  drill_scheduled: { icon: "🎯", label: "Drill" },
  spar: { icon: "🎙️", label: "Sparring" },
  linked: { icon: "📱", label: "iMessage" },
  paused: { icon: "⏸️", label: "Paused" },
  resumed: { icon: "▶️", label: "Resumed" },
  push_probe: { icon: "📲", label: "iMessage" },
  push_morning: { icon: "☕", label: "iMessage" },
  push_nudge: { icon: "📲", label: "iMessage" },
};

const WEAK_SOURCE_TEXT: Record<string, string> = {
  ide: "from the IDE",
  tapback: "from a ‼️ tapback",
  review: "from a missed review",
  manual: "flagged manually",
};

function stringField(detail: Record<string, unknown> | null, key: string): string | null {
  const value = detail?.[key];
  return typeof value === "string" && value ? value : null;
}

export function describeEvent(event: FeedEventLike): FeedRow {
  const detail = event.detail;
  const { emoji, rest } = splitLeadingEmoji(event.title);
  const problemId = stringField(detail, "problemId");
  const base: FeedRow = {
    id: event.id,
    icon: emoji ?? KIND_ICONS[event.kind]?.icon ?? "•",
    iconLabel: KIND_ICONS[event.kind]?.label ?? "Activity",
    title: rest || event.title,
    detail: null,
    tapback: null,
    href: problemId ? `/practice/${encodeURIComponent(problemId)}` : null,
    createdAt: event.createdAt,
  };

  if (event.kind === "review") {
    const source = detail?.source;
    const series = isActivitySource(source) ? ACTIVITY_SERIES.find((entry) => entry.key === source) : undefined;
    const cardId = stringField(detail, "cardId");
    const nextLabel = stringField(detail, "nextLabel");
    const grade = detail?.grade;
    // The store titles reviews "🧠 <card title> → 4d"; drop the interval suffix.
    // (No registry lookup: the content registry holds answer keys and must stay out of client bundles.)
    const title = rest.replace(/\s*→\s*\S+$/u, "");
    const parts = [series ? `via ${series.label}` : null, nextLabel ? `returns in ${nextLabel}` : null].filter(Boolean);
    return {
      ...base,
      icon: series?.icon ?? "🧠",
      iconLabel: series ? `Reviewed via ${series.label}` : "Reviewed",
      title,
      detail: parts.length ? parts.join(" · ") : null,
      tapback: typeof grade === "number" ? tapbackForGrade(grade) : null,
      // Problem cards share their problem id ("p-…"), so their reviews link back to the IDE.
      href: cardId?.startsWith("p-") ? `/practice/${encodeURIComponent(cardId)}` : null,
    };
  }

  if (event.kind === "weak_flag") {
    const source = stringField(detail, "source");
    return { ...base, detail: source ? WEAK_SOURCE_TEXT[source] ?? null : null };
  }

  if (event.kind === "ide_attempt") {
    const struggled = detail?.struggled === true;
    const passed = detail?.passed === true;
    return { ...base, detail: passed ? "passed" : struggled ? "struggled" : null };
  }

  return base;
}
