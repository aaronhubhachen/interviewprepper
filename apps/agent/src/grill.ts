import type { GrillQuestion, GrillTurn } from "@synapse/core";

/** Questions per text grill: fewer than the web's 8, since every answer is typed on a phone. */
export const SMS_GRILL_QUESTIONS = 5;
/** A grill left untouched this long is dropped (and its pasted resume deleted). */
export const SMS_GRILL_TTL_MS = 24 * 3_600_000;
/** Shorter than this and it is not a resume (the web requires the same). */
export const MIN_RESUME_CHARS = 80;

/** Per-user grill state in agent_state, cleared when the round ends. */
export interface SmsGrill {
  phase: "awaiting_resume" | "awaiting_answer";
  /** The pasted resume; deleted with the state when the round ends. */
  resume: string;
  asked: GrillQuestion[];
  turns: GrillTurn[];
  startedAt: number;
  touchedAt: number;
}

export function newGrill(now: number): SmsGrill {
  return { phase: "awaiting_resume", resume: "", asked: [], turns: [], startedAt: now, touchedAt: now };
}

export function isExpired(grill: SmsGrill, now: number): boolean {
  return now - grill.touchedAt > SMS_GRILL_TTL_MS;
}
