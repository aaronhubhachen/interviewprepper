/**
 * Pure thresholds and copy for the live sparring meters. Bands line up with
 * core's heuristicSparScores so what the live meter shows matches the final
 * score (pace 110-170 wpm, fillers < 3 per 100 words, "I" share >= 0.5).
 */
import type { StarPart, TranscriptAnalysis } from "@synapse/core/transcript";

/** Target answer length (the ring fills to this). */
export const TARGET_MS = 120_000;
/** Past this, the gentle "you're rambling" nudge appears. */
export const RAMBLE_MS = 150_000;
/** Recording auto-stops here (the API accepts up to 30 min; interviews never want that). */
export const MAX_RECORDING_MS = 10 * 60_000;
/** Typed answers are timed as if spoken at this pace. */
export const TYPED_WPM = 150;
/** API bounds for durationMs. */
export const MIN_DURATION_MS = 1_000;
export const MAX_DURATION_MS = 30 * 60_000;
/** API bound for the transcript. */
export const MAX_TRANSCRIPT_CHARS = 20_000;
/** Fewer words than this cannot be meaningfully graded. */
export const MIN_SUBMIT_WORDS = 8;
/** Below this, the EM falls back to heuristics (core skips the LLM under 15 words). */
export const SHORT_ANSWER_WORDS = 40;

export const PACE_BAND = { min: 110, max: 170 } as const;

export type Level = "idle" | "good" | "warn" | "bad";

export interface Reading {
  level: Level;
  label: string;
}

export const STAR_PARTS: readonly StarPart[] = ["situation", "task", "action", "result"];

export const STAR_COPY: Readonly<Record<StarPart, { letter: string; label: string; cue: string }>> = {
  situation: { letter: "S", label: "Situation", cue: "Set the scene: team, product, stakes." },
  task: { letter: "T", label: "Task", cue: "What did you own, and why was it hard?" },
  action: { letter: "A", label: "Action", cue: "What did YOU do? Use “I decided / I built”." },
  result: { letter: "R", label: "Result", cue: "Land the outcome, ideally with a number." },
};

export type TimerPhase = "on-track" | "wrap-up" | "over" | "rambling";

export function timerPhase(elapsedMs: number): TimerPhase {
  if (elapsedMs >= RAMBLE_MS) return "rambling";
  if (elapsedMs >= TARGET_MS) return "over";
  if (elapsedMs >= TARGET_MS - 20_000) return "wrap-up";
  return "on-track";
}

export function timerReading(elapsedMs: number): Reading {
  switch (timerPhase(elapsedMs)) {
    case "rambling":
      return { level: "bad", label: "Past 2:30. Wrap up" };
    case "over":
      return { level: "warn", label: "Over target. Land it" };
    case "wrap-up":
      return { level: "good", label: "Head for the result" };
    default:
      return { level: elapsedMs > 0 ? "good" : "idle", label: elapsedMs > 0 ? "On track" : "2:00 target" };
  }
}

/** Fraction of the target ring to fill (0..1). */
export function timerProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / TARGET_MS));
}

/** Speaking pace. Needs ~10 s and a dozen words before the number means anything. */
export function paceReading(wpm: number, wordCount: number, elapsedMs: number): Reading {
  if (elapsedMs < 10_000 || wordCount < 12) return { level: "idle", label: "Warming up" };
  if (wpm < 90) return { level: "bad", label: "Very slow" };
  if (wpm < PACE_BAND.min) return { level: "warn", label: "A bit slow" };
  if (wpm <= PACE_BAND.max) return { level: "good", label: "Conversational" };
  if (wpm <= 190) return { level: "warn", label: "A bit fast" };
  return { level: "bad", label: "Too fast. Breathe" };
}

/** Fillers per 100 words. */
export function fillerReading(fillerRate: number, wordCount: number): Reading {
  if (wordCount < 15) return { level: "idle", label: "Listening" };
  if (fillerRate < 3) return { level: "good", label: "Clean" };
  if (fillerRate < 6) return { level: "warn", label: "Noticeable" };
  return { level: "bad", label: "Distracting" };
}

/** "I" vs "we". A strong answer is mostly first person. */
export function ownershipReading(iStatements: number, weStatements: number): Reading {
  const total = iStatements + weStatements;
  if (total < 3) return { level: "idle", label: "Not enough yet" };
  const ratio = iStatements / total;
  if (ratio >= 0.6) return { level: "good", label: "Owning it" };
  if (ratio >= 0.45) return { level: "warn", label: "Claim your part" };
  return { level: "bad", label: "Too much “we”" };
}

/** Explicit outcome phrases (mirrors core's strong result cues) that make a sentence a real Result. */
const STRONG_RESULT_CUE = /\b(as a result|the result|resulted in|in the end|ultimately|outcome|end result|now we|going forward|since then)\b/i;

/**
 * Live-checklist view of core's STAR detection. Core also accepts outcome verbs
 * ("cut", "reduced") as a weak Result cue, so a goal like "my goal was to cut
 * latency" lights Result before any result was said. For live coaching, a
 * sentence that is already the Task/Situation evidence only counts as the Result
 * when it contains an explicit outcome phrase. Display-only: the server scores
 * with core's analysis as is.
 */
export function liveStar(star: TranscriptAnalysis["star"]): TranscriptAnalysis["star"] {
  const { result } = star;
  if (
    result.present &&
    result.evidence &&
    (result.evidence === star.task.evidence || result.evidence === star.situation.evidence) &&
    !STRONG_RESULT_CUE.test(result.evidence)
  ) {
    return { ...star, result: { present: false, evidence: null } };
  }
  return star;
}

/** Core's analysis with the live STAR adjustment applied (see liveStar). */
export function liveAnalysis(analysis: TranscriptAnalysis): TranscriptAnalysis {
  const star = liveStar(analysis.star);
  return star === analysis.star ? analysis : { ...analysis, star };
}

export function starCount(star: TranscriptAnalysis["star"]): number {
  return STAR_PARTS.filter((part) => star[part].present).length;
}

/** The first STAR part not yet detected (what to say next), or null when all four are there. */
export function nextStarPart(star: TranscriptAnalysis["star"]): StarPart | null {
  return STAR_PARTS.find((part) => !star[part].present) ?? null;
}

export interface Nudge {
  tone: "info" | "warning";
  text: string;
}

/**
 * The one gentle coaching line shown under the live meters. Priority: going
 * long > structural problems > delivery > "what to say next".
 */
export function liveNudge(analysis: TranscriptAnalysis, elapsedMs: number, mode: "voice" | "typed"): Nudge {
  const next = nextStarPart(analysis.star);
  if (elapsedMs >= RAMBLE_MS) {
    return {
      tone: "warning",
      text: analysis.star.result.present
        ? "You're past 2:30. Wrap up in one sentence."
        : "You're rambling a little. Jump to the result and stop.",
    };
  }
  if (elapsedMs >= TARGET_MS && !analysis.star.result.present) {
    return { tone: "warning", text: "Two minutes in: land the result now." };
  }
  const structural = analysis.rambleFlags.find((flag) => !flag.startsWith("Over 2.5 minutes"));
  if (structural && analysis.wordCount >= 60) return { tone: "warning", text: structural };
  if (analysis.wordCount >= 30 && analysis.fillerRate >= 6) {
    const top = analysis.fillers[0];
    return {
      tone: "warning",
      text: top ? `Lots of “${top.word}”. Pause silently instead.` : "Pause silently instead of filling gaps.",
    };
  }
  if (analysis.wordCount >= 60 && analysis.weStatements >= 4 && analysis.ownershipRatio < 0.45) {
    return { tone: "warning", text: "Lots of “we”. Say what you did." };
  }
  if (mode === "voice" && elapsedMs >= 20_000 && analysis.wordCount >= 12 && analysis.wpm > 190) {
    return { tone: "warning", text: "You're speeding up. Slow down a touch." };
  }
  if (analysis.wordCount === 0) {
    return {
      tone: "info",
      text: mode === "voice" ? "Open with one sentence of context: team, product, stakes." : "Type your answer the way you'd say it out loud.",
    };
  }
  if (next) return { tone: "info", text: `Next: ${STAR_COPY[next].cue}` };
  if (!analysis.hasMetrics) return { tone: "info", text: "Full STAR arc. Add a number to the result." };
  return { tone: "info", text: "Full STAR arc with numbers. Close with what you learned." };
}

/** Speaking time for a typed answer, as if read aloud at TYPED_WPM. */
export function estimateSpokenMs(wordCount: number): number {
  return Math.round((wordCount / TYPED_WPM) * 60_000);
}

/** Clamps a duration into the API's accepted range. */
export function clampDurationMs(ms: number): number {
  if (!Number.isFinite(ms)) return MIN_DURATION_MS;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(ms)));
}

/** Rough word count (same splitting as the analyzer's normalizer, cheap for live UI gating). */
export function countWords(text: string): number {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9%$]+/)
    .filter(Boolean).length;
}

export type ScoreBand = { label: string; level: Exclude<Level, "idle"> };

/** Human label for a 0-100 overall score. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return { label: "Offer-ready", level: "good" };
  if (score >= 70) return { label: "Strong", level: "good" };
  if (score >= 55) return { label: "Getting there", level: "warn" };
  if (score >= 40) return { label: "Needs structure", level: "warn" };
  return { label: "Rough draft", level: "bad" };
}
