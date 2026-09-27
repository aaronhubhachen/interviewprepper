/**
 * Card-flip IDE session: the pure state machine behind /practice/[id].
 * Stage 1 invariant → Stage 2 edge-case trap → Stage 3 code → done.
 * Persisted to sessionStorage so a reload resumes mid-problem; user code is
 * persisted separately (localStorage) and is never sent to the server.
 */
import { isCodeLanguage, type CodeLanguage } from "@synapse/core/judge";
import type { Evaluation } from "@synapse/core/grading";
import type { JudgeStatus } from "@synapse/core/judge";
import type { Rating } from "@synapse/core/sm2";
import type { TextGrade } from "@synapse/core/tapback";
import type { PracticeAttemptRequest, PracticeAttemptResponse, ScheduledDrills, TagRef } from "@/lib/types";

export type StageKey = "invariant" | "edgeCase" | "code";
export type TextStageKey = Exclude<StageKey, "code">;
export type SessionStep = StageKey | "done";

export const STAGE_ORDER: readonly StageKey[] = ["invariant", "edgeCase", "code"];

export const STAGE_META: Readonly<Record<StageKey, { number: 1 | 2 | 3; title: string; short: string; icon: string; blurb: string }>> = {
  invariant: { number: 1, title: "Invariant", short: "Invariant", icon: "🧭", blurb: "Name the invariant that makes the algorithm work." },
  edgeCase: { number: 2, title: "Edge-case trap", short: "Edge case", icon: "⚠️", blurb: "Spot the input that breaks the naive version." },
  code: { number: 3, title: "Code", short: "Code", icon: "⌨️", blurb: "Implement it and pass every test, hidden ones included." },
};

/** Ceiling for reported stage time (a tab left open overnight is not "time spent"). */
export const MAX_STAGE_MS = 60 * 60 * 1000;

/** What the attempt API said about a recorded stage. */
export interface StageSync {
  /** False when the user chose to continue without saving (server unreachable). */
  saved: boolean;
  passed: boolean;
  struggled: boolean;
  flaggedTags: TagRef[];
  scheduled: ScheduledDrills | null;
  graded: { grade: TextGrade; nextLabel: string; dueAt: number } | null;
  message: string | null;
  at: number;
}

export interface TextStageResult {
  /** The answer that was graded. */
  answer: string;
  evaluation: Evaluation;
  answerKey: string;
  keyPoints: string[];
  suggestedRating: Rating;
}

export interface TextStageState {
  draft: string;
  hintShown: boolean;
  /** "I'm stuck": the answer was revealed without a real attempt. */
  revealed: boolean;
  result: TextStageResult | null;
  rating: Rating | null;
  activeMs: number;
  /** Set once the confidence tapback was recorded; the stage is then complete. */
  sync: StageSync | null;
}

export interface JudgeSummary {
  mode: "run" | "submit";
  status: JudgeStatus;
  passed: number;
  total: number;
  language: CodeLanguage;
  at: number;
}

export interface CodeStageState {
  language: CodeLanguage;
  /** Visible-test runs (free practice, never recorded). */
  runs: number;
  failedRuns: number;
  /** Recorded submissions (compile errors are not counted). */
  submits: number;
  failedSubmits: number;
  last: JudgeSummary | null;
  lastSubmit: JudgeSummary | null;
  /** Highest-scoring counted submit (optional: sessions persisted before it existed lack it). */
  bestSubmit?: JudgeSummary | null;
  gaveUp: boolean;
  /** Accepted submission or give-up recorded. */
  completed: boolean;
  activeMs: number;
  syncs: StageSync[];
}

export interface PracticeSession {
  version: 1;
  problemId: string;
  startedAt: number;
  current: SessionStep;
  invariant: TextStageState;
  edgeCase: TextStageState;
  code: CodeStageState;
}

function freshText(): TextStageState {
  return { draft: "", hintShown: false, revealed: false, result: null, rating: null, activeMs: 0, sync: null };
}

export function newSession(problemId: string, now: number, language: CodeLanguage = "javascript"): PracticeSession {
  return {
    version: 1,
    problemId,
    startedAt: now,
    current: "invariant",
    invariant: freshText(),
    edgeCase: freshText(),
    code: {
      language,
      runs: 0,
      failedRuns: 0,
      submits: 0,
      failedSubmits: 0,
      last: null,
      lastSubmit: null,
      bestSubmit: null,
      gaveUp: false,
      completed: false,
      activeMs: 0,
      syncs: [],
    },
  };
}

export type SessionAction =
  | { type: "restore"; session: PracticeSession }
  | { type: "reset"; now: number; language?: CodeLanguage }
  | { type: "draft"; stage: TextStageKey; text: string }
  | { type: "hint"; stage: TextStageKey }
  | { type: "evaluated"; stage: TextStageKey; result: TextStageResult; revealed: boolean }
  | { type: "retry"; stage: TextStageKey }
  | { type: "completeText"; stage: TextStageKey; rating: Rating; sync: StageSync; activeMs: number }
  | { type: "time"; stage: StageKey; activeMs: number }
  | { type: "language"; language: CodeLanguage }
  | { type: "judged"; summary: JudgeSummary; counted: boolean }
  | { type: "codeSynced"; sync: StageSync; completed: boolean; gaveUp: boolean; activeMs: number };

function clampMs(ms: number): number {
  return Number.isFinite(ms) ? Math.min(Math.max(0, Math.round(ms)), MAX_STAGE_MS) : 0;
}

export function nextStep(stage: StageKey): SessionStep {
  const index = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER[index + 1] ?? "done";
}

export function sessionReducer(state: PracticeSession, action: SessionAction): PracticeSession {
  switch (action.type) {
    case "restore":
      return action.session;
    case "reset":
      return newSession(state.problemId, action.now, action.language ?? state.code.language);
    case "draft": {
      const stage = state[action.stage];
      if (stage.result) return state;
      return { ...state, [action.stage]: { ...stage, draft: action.text } };
    }
    case "hint": {
      const stage = state[action.stage];
      if (stage.hintShown) return state;
      return { ...state, [action.stage]: { ...stage, hintShown: true } };
    }
    case "evaluated": {
      const stage = state[action.stage];
      if (stage.sync) return state;
      return { ...state, [action.stage]: { ...stage, result: action.result, revealed: action.revealed } };
    }
    case "retry": {
      // Only before the answer was revealed by a grade: lets a failed request be retried.
      const stage = state[action.stage];
      if (stage.sync) return state;
      return { ...state, [action.stage]: { ...stage, result: null, revealed: false } };
    }
    case "completeText": {
      const stage = state[action.stage];
      if (stage.sync) return state;
      const completed: TextStageState = { ...stage, rating: action.rating, sync: action.sync, activeMs: clampMs(action.activeMs) };
      const current = state.current === action.stage ? nextStep(action.stage) : state.current;
      return { ...state, [action.stage]: completed, current };
    }
    case "time": {
      if (action.stage === "code") {
        if (state.code.completed) return state;
        return { ...state, code: { ...state.code, activeMs: clampMs(action.activeMs) } };
      }
      const stage = state[action.stage];
      if (stage.sync) return state;
      return { ...state, [action.stage]: { ...stage, activeMs: clampMs(action.activeMs) } };
    }
    case "language":
      return state.code.language === action.language ? state : { ...state, code: { ...state.code, language: action.language } };
    case "judged": {
      const { summary } = action;
      const failed = summary.status !== "accepted";
      const code = { ...state.code, last: summary };
      if (summary.mode === "run") {
        code.runs += 1;
        if (failed) code.failedRuns += 1;
      } else if (action.counted) {
        code.submits += 1;
        if (failed) code.failedSubmits += 1;
        code.lastSubmit = summary;
        code.bestSubmit = betterSubmit(bestSubmit(state.code), summary);
      }
      return { ...state, code };
    }
    case "codeSynced": {
      if (state.code.completed) return state;
      const code: CodeStageState = {
        ...state.code,
        syncs: [...state.code.syncs, action.sync],
        completed: action.completed,
        gaveUp: state.code.gaveUp || action.gaveUp,
        activeMs: clampMs(action.activeMs),
      };
      return { ...state, code, current: action.completed && state.current === "code" ? "done" : state.current };
    }
  }
}

// ── derived ────────────────────────────────────────────────────────────────

function passRate(summary: JudgeSummary): number {
  return summary.total > 0 ? summary.passed / summary.total : 0;
}

/** The higher-scoring of two submits (ties keep the earlier one). */
function betterSubmit(best: JudgeSummary | null, candidate: JudgeSummary): JudgeSummary {
  return best && passRate(best) >= passRate(candidate) ? best : candidate;
}

/** Highest-scoring counted submit; falls back to the last one for sessions persisted before bestSubmit existed. */
export function bestSubmit(code: CodeStageState): JudgeSummary | null {
  return code.bestSubmit ?? code.lastSubmit;
}

/**
 * "Give up" is only recordable while nothing is being saved and no submit was
 * accepted: an accepted solve (saving, saved, or failed to save) must never
 * get a give-up recorded on top of it.
 */
export function canGiveUp(code: CodeStageState, saving: boolean): boolean {
  return !saving && !code.completed && code.lastSubmit?.status !== "accepted";
}

/**
 * What the "Couldn't grade that answer" Retry should send: a failed "I'm
 * stuck" reveals again (true), a failed answer re-grades the draft (false),
 * and null when there is nothing to retry (the draft was cleared).
 */
export function evaluationRetry(failedReveal: boolean, draft: string): boolean | null {
  if (failedReveal) return true;
  return draft.trim() ? false : null;
}

export function hintsUsed(session: PracticeSession): number {
  return (session.invariant.hintShown ? 1 : 0) + (session.edgeCase.hintShown ? 1 : 0);
}

export type StageStatus = "upcoming" | "current" | "done";

export function stageStatus(session: PracticeSession, stage: StageKey): StageStatus {
  if (session.current === "done") return "done";
  const current = STAGE_ORDER.indexOf(session.current);
  const index = STAGE_ORDER.indexOf(stage);
  return index < current ? "done" : index === current ? "current" : "upcoming";
}

export function allSyncs(session: PracticeSession): StageSync[] {
  return [session.invariant.sync, session.edgeCase.sync, ...session.code.syncs].filter((sync): sync is StageSync => sync !== null);
}

/** Most recent sync that queued iMessage drills (drives the "📲 Flagged …" banner). */
export function latestSchedule(session: PracticeSession): StageSync | null {
  return (
    allSyncs(session)
      .filter((sync) => sync.scheduled !== null && sync.scheduled.cardIds.length > 0)
      .sort((a, b) => b.at - a.at)[0] ?? null
  );
}

/** Every tag flagged during this session (deduplicated, first flag first). */
export function flaggedTags(session: PracticeSession): TagRef[] {
  const seen = new Map<string, TagRef>();
  for (const sync of allSyncs(session).sort((a, b) => a.at - b.at)) {
    for (const ref of sync.flaggedTags) if (!seen.has(ref.tag)) seen.set(ref.tag, ref);
  }
  return [...seen.values()];
}

export function codeGrade(session: PracticeSession): StageSync["graded"] {
  return [...session.code.syncs].reverse().find((sync) => sync.graded)?.graded ?? null;
}

export function totalActiveMs(session: PracticeSession): number {
  return session.invariant.activeMs + session.edgeCase.activeMs + session.code.activeMs;
}

/** Stage 1/2 outcome: passing needs a confident-enough rating and a real attempt. */
export function textStagePassed(grade: TextGrade, revealed: boolean): boolean {
  return grade >= 3 && !revealed;
}

// ── struggle → sync copy ───────────────────────────────────────────────────

/** "A", "A and B", "A, B and C". */
export function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/** "Flagged Bitmask DP — Prepr will text you a drill tomorrow at 9:00 AM" (or "in 1 min" at demo scale). */
export function drillMessage(flags: readonly TagRef[], scheduled: ScheduledDrills): string {
  const count = scheduled.cardIds.length;
  const texts = `Prepr will text you ${count === 1 ? "a drill" : `${count} drills`} ${scheduled.dueLabel ?? "soon"}`;
  return flags.length > 0 ? `Flagged ${joinLabels(flags.map((flag) => flag.label))} — ${texts}` : texts;
}

// ── attempt payloads (never include user code) ─────────────────────────────

export function textAttemptRequest(
  session: PracticeSession,
  stage: TextStageKey,
  grade: TextGrade,
  activeMs: number,
): PracticeAttemptRequest {
  const state = session[stage];
  return {
    problemId: session.problemId,
    stage,
    grade,
    passed: textStagePassed(grade, state.revealed),
    failedRuns: 0,
    hintsUsed: hintsUsed(session),
    gaveUp: state.revealed || undefined,
    durationMs: clampMs(activeMs),
    answer: (state.result?.answer ?? state.draft).slice(0, 4000),
  };
}

export function codeAttemptRequest(
  session: PracticeSession,
  input: { passed: boolean; gaveUp?: boolean; testsPassed?: number; testsTotal?: number; activeMs: number },
): PracticeAttemptRequest {
  return {
    problemId: session.problemId,
    stage: "code",
    passed: input.passed,
    // Failed submissions BEFORE this one (attemptNumber = failedRuns + 1; 3+ tries is a struggle).
    failedRuns: session.code.failedSubmits,
    hintsUsed: hintsUsed(session),
    gaveUp: input.gaveUp || undefined,
    durationMs: clampMs(input.activeMs),
    language: session.code.language,
    testsPassed: input.testsPassed,
    testsTotal: input.testsTotal,
  };
}

export function syncFromResponse(response: PracticeAttemptResponse, at: number): StageSync {
  return {
    saved: true,
    passed: response.passed,
    struggled: response.struggled,
    flaggedTags: response.flaggedTags,
    scheduled: response.scheduled,
    graded: response.graded,
    message: response.message,
    at,
  };
}

/** Local stand-in when the user continues without saving (server unreachable). */
export function unsavedSync(passed: boolean, at: number): StageSync {
  return { saved: false, passed, struggled: !passed, flaggedTags: [], scheduled: null, graded: null, message: null, at };
}

// ── persistence ────────────────────────────────────────────────────────────

export const sessionStorageKey = (problemId: string) => `synapse:practice-session:v1:${problemId}`;
export const codeStorageKey = (problemId: string, language: CodeLanguage) => `synapse:code:v1:${problemId}:${language}`;
export const LANGUAGE_STORAGE_KEY = "synapse:code-language:v1";

const STEPS = new Set<string>(["invariant", "edgeCase", "code", "done"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTextStage(value: unknown): value is TextStageState {
  return (
    isRecord(value) &&
    typeof value.draft === "string" &&
    typeof value.hintShown === "boolean" &&
    typeof value.revealed === "boolean" &&
    typeof value.activeMs === "number" &&
    (value.result === null || (isRecord(value.result) && isRecord(value.result.evaluation) && typeof value.result.answerKey === "string")) &&
    (value.sync === null || isRecord(value.sync))
  );
}

function isCodeStage(value: unknown): value is CodeStageState {
  return (
    isRecord(value) &&
    typeof value.language === "string" &&
    isCodeLanguage(value.language) &&
    ["runs", "failedRuns", "submits", "failedSubmits", "activeMs"].every((key) => typeof value[key] === "number") &&
    typeof value.completed === "boolean" &&
    typeof value.gaveUp === "boolean" &&
    Array.isArray(value.syncs)
  );
}

/** Parses a persisted session; null when missing, corrupt, from another version, or another problem. */
export function parseSession(json: string | null, problemId: string): PracticeSession | null {
  if (!json) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== 1 || value.problemId !== problemId) return null;
  if (typeof value.current !== "string" || !STEPS.has(value.current) || typeof value.startedAt !== "number") return null;
  if (!isTextStage(value.invariant) || !isTextStage(value.edgeCase) || !isCodeStage(value.code)) return null;
  return value as unknown as PracticeSession;
}

/** localStorage / sessionStorage that never throws (private mode, quota, SSR). */
export function safeStorage(kind: "local" | "session"): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const resolve = (): Storage | null => {
    try {
      if (typeof window === "undefined") return null;
      return kind === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };
  return {
    getItem(key) {
      try {
        return resolve()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        resolve()?.setItem(key, value);
      } catch {
        // storage full or blocked: persistence is best-effort
      }
    },
    removeItem(key) {
      try {
        resolve()?.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
