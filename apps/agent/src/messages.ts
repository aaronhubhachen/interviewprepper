/**
 * Every user-facing text the agent sends. iMessage renders plain text only:
 * no markdown, no LaTeX. Keep lines short, emoji-led and phone-friendly.
 */
import type { GrillQuestion, GrillReport } from "@synapse/core";
import {
  clampSentences,
  toPlainText,
  VERDICT_EMOJI,
  type Evaluation,
  type GradeOutcome,
  type IntervalPreview,
  type Rating,
  type ReviewCard,
  type Stats,
} from "@synapse/core";

/**
 * Card text is authored plain (core's content tests forbid markdown/LaTeX), so it is only
 * trimmed: running it through toPlainText would eat the asterisks in "2^n * n^2 … 2^n * n".
 */
export function plain(text: string): string {
  return text.trim();
}

/** Model output gets the full markdown/LaTeX strip (core already does this; it is idempotent). */
function sanitizeFeedback(evaluation: Evaluation): string {
  return evaluation.source === "llm" ? toPlainText(evaluation.feedback).trim() : evaluation.feedback.trim();
}

export const PROBE_FOOTER = "(Reply in 1 sentence · ❓ tapback for a hint · 'idk' to reveal)";
/** Used when the card's prompt already says how long to answer ("Reply in 1-2 sentences."). */
export const PROBE_FOOTER_SHORT = "(❓ tapback for a hint · 'idk' to reveal)";

export const RATING_COPY: Readonly<Record<Rating, { emoji: string; label: string }>> = {
  love: { emoji: "❤️", label: "Effortless" },
  like: { emoji: "👍", label: "Hesitant" },
  dislike: { emoji: "👎", label: "Guessed" },
};

export function ratingForGrade(grade: number): Rating {
  if (grade >= 5) return "love";
  if (grade >= 3) return "like";
  return "dislike";
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatEase(ease: number): string {
  return String(Math.round(ease * 100) / 100);
}

function streakSentence(streak: number): string {
  return streak > 0 ? ` 🔥 ${streak}-day streak.` : "";
}

// ── Probes ─────────────────────────────────────────────────────────────────

export interface ProbeCopy {
  card: ReviewCard;
  /** First card of the day, right after a morning briefing (not an afternoon check-in). */
  morning: boolean;
  /** "🎯 Drill: Bitmask DP · from your IDE run on …" for IDE-struggle drills. */
  drillNote?: string;
  /** The card failed recently and is back for another try. */
  retry?: boolean;
}

export function probe({ card, morning, drillNote, retry }: ProbeCopy): string {
  const lines = [morning ? `☕ Morning Prepr · ${card.title}` : `🧠 Prepr · ${card.title}`];
  if (drillNote) lines.push(drillNote);
  else if (retry) lines.push("🔁 Back for round two.");
  const prompt = plain(card.prompt);
  lines.push("", prompt, "", /\b(reply|answer) in\b/i.test(prompt) ? PROBE_FOOTER_SHORT : PROBE_FOOTER);
  return lines.join("\n");
}

export function drillNote(tagLabels: string[], problemTitle?: string): string {
  const focus = tagLabels.length > 0 ? tagLabels.join(" + ") : "a weak spot";
  return problemTitle ? `🎯 Drill: ${focus} · from your IDE run on ${problemTitle}` : `🎯 Drill: ${focus}`;
}

export interface BriefingCopy {
  due: number;
  newCards: number;
  weakSpot?: { label: string; context?: string };
  streak: number;
  /** The day's first briefing lands after the morning: "🧠 Prepr check-in" instead of "☕ Morning Prepr". */
  checkIn?: boolean;
}

/** "☕ Morning Prepr — 5 cards due. Weak spot: Bitmask DP (you struggled on … last night)." */
export function morningBriefing({ due, newCards, weakSpot, streak, checkIn }: BriefingCopy): string {
  const load = due > 0 ? `${plural(due, "card")} due` : newCards > 0 ? `${plural(newCards, "fresh card")} lined up` : "one quick card";
  let text = `${checkIn ? "🧠 Prepr check-in" : "☕ Morning Prepr"} — ${load}.`;
  if (weakSpot) text += ` Weak spot: ${weakSpot.label}${weakSpot.context ? ` (${weakSpot.context})` : ""}.`;
  if (streak > 0) text += ` 🔥 ${streak}-day streak, keep it alive.`;
  return text;
}

// ── Answer feedback ────────────────────────────────────────────────────────

/** "Tap this message: ❤️ Effortless → 4d · 👍 Hesitant → 1d · 👎 Guessed → 10m" */
export function confidenceLegend(preview: Record<Rating, IntervalPreview>): string {
  const options = (["love", "like", "dislike"] as const).map(
    (rating) => `${RATING_COPY[rating].emoji} ${RATING_COPY[rating].label} → ${preview[rating].label}`,
  );
  return `Tap this message: ${options.join(" · ")}`;
}

function comparable(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function feedback(card: ReviewCard, evaluation: Evaluation, preview: Record<Rating, IntervalPreview>): string {
  const said = sanitizeFeedback(evaluation).replace(/\ball 2 key points\b/, "both key points");
  const lines = [`${VERDICT_EMOJI[evaluation.verdict]} ${said}`];
  if (evaluation.verdict !== "correct") {
    const keyIdea = clampSentences(plain(card.answerKey), 1, 220);
    if (!comparable(evaluation.feedback).includes(comparable(keyIdea).slice(0, 60))) lines.push(`🔑 ${keyIdea}`);
  }
  lines.push("", confidenceLegend(preview), "(or reply easy / ok / again)");
  return lines.join("\n");
}

// ── Grading ────────────────────────────────────────────────────────────────

/** "🧠 Locked in. LRU Cache returns in 6d (ease 2.6). 🔥 4-day streak. Reply 'more' for another." */
export function lockedIn(outcome: GradeOutcome, streak: number): string {
  return `🧠 Locked in. ${outcome.card.title} returns in ${outcome.nextLabel} (ease ${formatEase(outcome.after.easeFactor)}).${streakSentence(streak)} Reply 'more' for another.`;
}

/** 👎: explain the key idea once more, then schedule the short relearn. */
export function relearn(outcome: GradeOutcome, streak: number): string {
  return [
    `🔁 No sweat. The key idea once more: ${plain(outcome.card.explanation)}`,
    "",
    `${outcome.card.title} comes back in ${outcome.nextLabel} for another shot.${streakSentence(streak)} Reply 'more' to keep going.`,
  ].join("\n");
}

/** "idk": answer key + explanation, auto-graded as a blank. */
export function reveal(outcome: GradeOutcome): string {
  return [
    `💡 ${plain(outcome.card.answerKey)}`,
    "",
    `🔎 Why: ${plain(outcome.card.explanation)}`,
    "",
    `🔁 Logged as a blank. ${outcome.card.title} comes back in ${outcome.nextLabel} so it sticks. Reply 'more' for another.`,
  ].join("\n");
}

/** 'more' while a rating is outstanding: the evaluator's grade is applied. */
export function autoGraded(outcome: GradeOutcome, rating: Rating): string {
  const copy = RATING_COPY[rating];
  return `${copy.emoji} Logged ${outcome.card.title} as ${copy.label} (my grade). Back in ${outcome.nextLabel}.`;
}

/** A changed tapback on the feedback (❤️ → 👎) replaced the earlier rating. */
export function regraded(outcome: GradeOutcome, rating: Rating): string {
  const copy = RATING_COPY[rating];
  return `✏️ Updated: ${outcome.card.title} is now ${copy.emoji} ${copy.label}. Back in ${outcome.nextLabel}.`;
}

/** Fallback when the rating was saved but the full confirmation could not be sent. */
export function gradeSaved(outcome: GradeOutcome, rating: Rating): string {
  const copy = RATING_COPY[rating];
  return `✅ Saved: ${outcome.card.title} as ${copy.emoji} ${copy.label}, back in ${outcome.nextLabel}. Reply 'more' for another.`;
}

/** Fallback when an 'idk' was logged but the full reveal could not be sent: the answer key still goes out. */
export function revealSaved(outcome: GradeOutcome): string {
  return `💡 ${clampSentences(plain(outcome.card.answerKey), 2, 300)}\n🔁 Saved as a blank. ${outcome.card.title} comes back in ${outcome.nextLabel}.`;
}

// ── Card helpers ───────────────────────────────────────────────────────────

export function hint(card: ReviewCard): string {
  return `💡 Hint: ${plain(card.hint)}\n(Answer in 1 sentence, or 'idk' to reveal.)`;
}

export function noSpoilers(card: ReviewCard): string {
  return `🙊 No spoilers yet. 💡 Hint: ${plain(card.hint)}\n('idk' reveals the answer.)`;
}

export function explanation(card: ReviewCard): string {
  return `🔎 ${card.title}: ${plain(card.explanation)}`;
}

export function flagged(card: ReviewCard, tagLabels: string[]): string {
  return `‼️ Flagged ${tagLabels.join(" + ")} as a weak spot. I'll drill ${card.tags.length > 1 ? "them" : "it"} more often.`;
}

export function stillOpen(card: ReviewCard): string {
  return `🧠 Still open: ${card.title}. Answer in 1 sentence, 'hint' for a nudge, or 'skip' for a different card.`;
}

export function answerFirst(): string {
  return "✍️ Answer first (1 sentence), then rate my feedback. Or 'idk' to reveal.";
}

export function rateFirst(card: ReviewCard): string {
  return `⭐ Rate ${card.title} first: tap my feedback ❤️ / 👍 / 👎, or reply easy / ok / again. ('more' moves on.)`;
}

export function skipped(card: ReviewCard): string {
  return `⏭️ Skipped ${card.title}. It'll come back later.`;
}

export function nothingToSkip(): string {
  return "🤷 Nothing to skip. Reply 'more' for a card.";
}

export function noOpenCard(): string {
  return "🤷 No open card right now. Reply 'more' for one.";
}

export function cardRetired(): string {
  return "🧹 That card was retired from the deck. Reply 'more' for a fresh one.";
}

export interface CaughtUpCopy {
  /** SRS-unit label until the next review, e.g. "3h". */
  nextLabel?: string;
  newCapReached: boolean;
}

export function caughtUp({ nextLabel, newCapReached }: CaughtUpCopy): string {
  let text = "🎉 All caught up!";
  if (newCapReached) text += " You've hit today's new-card goal.";
  text += nextLabel ? ` Next review in ${nextLabel}; I'll text you.` : " I'll text you when something's due.";
  return text;
}

// ── Onboarding & commands ──────────────────────────────────────────────────

export function onboarding(webUrl: string): string {
  return [
    "👋 Hey! I'm Prepr, your spaced-repetition interview coach. I text bite-size DSA cards right before you'd forget them.",
    "",
    `🔗 Text 'link 123456' with the code on your dashboard (${webUrl}) to sync, or 'start' to jump right in.`,
  ].join("\n");
}

export function notStarted(webUrl: string): string {
  return `👋 Text 'start' to begin drilling here, or 'link 123456' with the code on your dashboard (${webUrl}).`;
}

export function linked(): string {
  return [
    "🔗 Linked! This chat now syncs with your Prepr dashboard.",
    "Answer each card in 1 sentence, then rate my feedback with a tapback: ❤️ effortless · 👍 hesitant · 👎 guessed. 'help' lists commands.",
  ].join("\n");
}

export function startedSolo(webUrl: string): string {
  return [
    "🧠 You're in! I'll text cards right when they're due.",
    `Rate my feedback with a tapback: ❤️ effortless · 👍 hesitant · 👎 guessed. To sync the web dashboard later, text 'link 123456' with the code from ${webUrl}.`,
  ].join("\n");
}

export function welcomeBack(): string {
  return "👋 You're all set. Here's your next card.";
}

export function linkFailed(webUrl: string): string {
  return `🤔 That code didn't match (codes expire after 10 minutes). Grab the 6-digit code from your dashboard (${webUrl}) and text 'link 123456'.`;
}

export function linkUsage(webUrl: string): string {
  return `🔗 Text 'link' plus the 6-digit code from your dashboard (${webUrl}), e.g. 'link 123456'.`;
}

export function linkLocked(): string {
  return "🔒 Too many wrong codes. Wait an hour, then text 'link' with the 6-digit code from your dashboard.";
}

export function textOnly(): string {
  return "📎 I can only read text. Type your answer in a sentence, or 'help' for commands.";
}

export function greeting(): string {
  return "👋 Hey! Reply 'more' for a card, 'stats' for your progress, or 'help' for everything I can do.";
}

export function idle(): string {
  return "🤖 No open card right now. Reply 'more' for one, 'stats' for progress, or 'help'.";
}

export function help(): string {
  return [
    "🧠 Prepr commands",
    "• more: next card",
    "• hint: a nudge (or ❓ tapback)",
    "• idk: reveal the answer",
    "• skip: skip this card",
    "• why: explain the last card",
    "• stats: your progress",
    "• pause / resume: texts off / on",
    "• grill: defend your resume against a skeptical interviewer ('end grill' to stop)",
    "Rate my feedback with a tapback: ❤️ effortless · 👍 hesitant · 👎 guessed. ‼️ marks a weak spot.",
  ].join("\n");
}

export function paused(): string {
  return "⏸️ Paused. No more texts from me until you reply 'resume'. ('more' still works anytime.)";
}

export function resumed(): string {
  return "▶️ Back on! I'll text your next card when it's due, or reply 'more' now.";
}

export function stats(s: Stats, webUrl: string): string {
  const retention = s.retention30d === null ? "no reviews yet" : `${Math.round(s.retention30d * 100)}%`;
  const lines = [
    "📊 Your Prepr",
    `🗓️ Due now: ${s.dueNow} · Reviewed today: ${s.reviewedToday}`,
    `🔥 Streak: ${plural(s.streakDays, "day")}`,
    `🎯 Retention (30d): ${retention}`,
    `🧠 Learned: ${s.cardsLearned} of ${s.totalCards} cards`,
  ];
  const weak = s.weakTags[0];
  if (weak) lines.push(`⚠️ Weak spot: ${weak.label}`);
  if (s.link.paused) lines.push("⏸️ Texts paused (reply 'resume')");
  lines.push(`📈 Dashboard: ${webUrl}`);
  return lines.join("\n");
}

/** Sent when SYNAPSE_OWNER_HANDLE links at startup; the first card (or "all caught up") follows right away. */
export function ownerHello(webUrl: string): string {
  return [
    "👋 Prepr is live on iMessage. I'll text you bite-size DSA cards right before you'd forget them.",
    `Answer in 1 sentence, then rate my feedback with a tapback: ❤️ effortless · 👍 hesitant · 👎 guessed. 'help' lists commands. Dashboard: ${webUrl}`,
  ].join("\n");
}

export function glitch(): string {
  return "⚠️ Something glitched on my end. Try that again in a sec.";
}

// ── Resume grill over text ─────────────────────────────────────────────────

export function grillIntro(questions: number): string {
  return [
    "🔥 Resume grill. Paste your resume as text in your next message (a PDF won't come through).",
    `I'll pick it apart one claim at a time for ${questions} questions: inflated verbs, unverifiable numbers, shallow tech.`,
    "Reply 'end grill' anytime for the verdict so far.",
  ].join("\n");
}

export function grillNeedsResume(minChars: number): string {
  return `📄 That's too short to be a resume. Paste the full text (at least ${minChars} characters), or 'end grill' to cancel.`;
}

export function grillQuestion(question: GrillQuestion, number: number, total: number): string {
  const lines = [];
  if (question.reaction) lines.push(question.reaction);
  lines.push(`🔥 ${number}/${total}: ${question.question}`);
  lines.push(`(On: ${question.target})`);
  return lines.join("\n");
}

export function grillWeighing(): string {
  return "⚖️ The panel is weighing your answers…";
}

const CLAIM_EMOJI = { held: "✅", shaky: "🟡", cracked: "💥" } as const;

export function grillVerdict(report: GrillReport, webUrl: string): string {
  const lines = [`🔥 Resume grill verdict: ${report.overall}/100`, report.summary];
  for (const claim of report.claims.slice(0, 4)) lines.push(`${CLAIM_EMOJI[claim.verdict]} ${claim.claim}`);
  if (report.fixes[0]) lines.push(`Fix first: ${report.fixes[0]}`);
  lines.push(`Full report: ${webUrl.replace(/\/$/, "")}/grill`);
  return lines.join("\n");
}

export function grillCancelled(): string {
  return "🧯 Grill cancelled. Your resume text is deleted. Reply 'grill' to start again.";
}

export function grillNotRunning(): string {
  return "No grill running. Reply 'grill' to start one.";
}
