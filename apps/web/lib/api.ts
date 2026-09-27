/**
 * Typed browser fetchers for every Prepr API route. Safe in client components.
 * All functions reject with ApiError on non-2xx responses or network failures,
 * and accept an optional AbortSignal.
 */
import type { ReviewActivityResponse } from "@/components/dashboard/activity-data";
import type {
  ApiErrorBody,
  BehavioralResponse,
  BotChatRequest,
  BotChatResponse,
  BotInlineEditRequest,
  BotInlineEditResponse,
  BotReportRequest,
  BotReportResponse,
  GrillNextResponse,
  GrillReport,
  MockLoopInput,
  MockPacket,
  PracticeSessionsResponse,
  JudgeLanguagesResponse,
  JudgeRunRequest,
  JudgeRunResponse,
  GrillResumeResponse,
  GrillSessionRequest,
  DueResponse,
  LinkResponse,
  PracticeAttemptRequest,
  PracticeAttemptResponse,
  PracticeEvaluateRequest,
  PracticeEvaluateResponse,
  ProblemResponse,
  ProblemSolutionResponse,
  ProblemsResponse,
  ReviewEvaluateRequest,
  ReviewEvaluateResponse,
  ReviewGradeRequest,
  ReviewGradeResponse,
  ReviewNextQuery,
  ReviewNextResponse,
  SparEvaluateRequest,
  SparEvaluateResponse,
  SparSessionsResponse,
  StatsResponse,
  Tag,
} from "./types";

export class ApiError extends Error {
  constructor(
    /** HTTP status (0 for network errors / aborted requests). */
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
}

/** Fired on window after anything that changes the due queue (grades, IDE attempts). The nav badge listens. */
export const DUE_CHANGED_EVENT = "synapse:due-changed";

export function notifyDueChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DUE_CHANGED_EVENT));
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return Boolean(value && typeof value === "object" && "error" in value && typeof (value as ApiErrorBody).error?.message === "string");
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError(0, "aborted", "Request was cancelled.");
    throw new ApiError(0, "network", "Could not reach the Prepr server. Is it running?");
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (isErrorBody(payload)) throw new ApiError(response.status, payload.error.code, payload.error.message, payload.error.details);
    throw new ApiError(response.status, "http_error", `Request failed (${response.status}).`);
  }
  return payload as T;
}

const get = <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options);
const post = <T>(path: string, body: unknown, options?: RequestOptions) => request<T>("POST", path, body, options);

// ── Dashboard ────────────────────────────────────────────────────────────

/** GET /api/stats */
export function fetchStats(options?: RequestOptions): Promise<StatsResponse> {
  return get("/api/stats", options);
}

/** GET /api/review/due (cheap; for badges). */
export function fetchDue(options?: RequestOptions): Promise<DueResponse> {
  return get("/api/review/due", options);
}

/** GET /api/activity: reviews per day (30 buckets), split by surface (iMessage / web / IDE / voice). */
export function fetchReviewActivity(options?: RequestOptions): Promise<ReviewActivityResponse> {
  return get("/api/activity", options);
}

/** GET /api/link */
export function fetchLink(options?: RequestOptions): Promise<LinkResponse> {
  return get("/api/link", options);
}

/** POST /api/link { paused } */
export function setAgentPaused(paused: boolean, options?: RequestOptions): Promise<LinkResponse> {
  return post("/api/link", { paused }, options);
}

/** POST /api/link/unlink {}: drops the iMessage link (or, while unlinked, replaces the code) and returns the fresh code. */
export function unlinkAgent(options?: RequestOptions): Promise<LinkResponse> {
  return post("/api/link/unlink", {}, options);
}

// ── Flashcard review ─────────────────────────────────────────────────────

/** GET /api/review/next?tag=&exclude=&kind= */
export function fetchNextCard(query: ReviewNextQuery = {}, options?: RequestOptions): Promise<ReviewNextResponse> {
  const params = new URLSearchParams();
  if (query.tag) params.set("tag", query.tag);
  if (query.kind) params.set("kind", query.kind);
  if (query.exclude?.length) params.set("exclude", query.exclude.join(","));
  const qs = params.toString();
  return get(`/api/review/next${qs ? `?${qs}` : ""}`, options);
}

export interface BonusQuery {
  tag?: Tag;
  exclude?: string[];
}

/**
 * GET /api/review/bonus?tag=&exclude=: the next never-seen card, ignoring the daily
 * new-card cap ("Study new cards" once the queue is empty). reason = "extra".
 */
export function fetchBonusCard(query: BonusQuery = {}, options?: RequestOptions): Promise<ReviewNextResponse> {
  const params = new URLSearchParams();
  if (query.tag) params.set("tag", query.tag);
  if (query.exclude?.length) params.set("exclude", query.exclude.join(","));
  const qs = params.toString();
  return get(`/api/review/bonus${qs ? `?${qs}` : ""}`, options);
}

/** POST /api/review/evaluate: grade a free-text answer (may take a few seconds with an LLM). */
export function evaluateCardAnswer(body: ReviewEvaluateRequest, options?: RequestOptions): Promise<ReviewEvaluateResponse> {
  return post("/api/review/evaluate", body, options);
}

/** POST /api/review/grade: apply the tapback rating (SM-2). Fires DUE_CHANGED_EVENT. */
export async function gradeCard(body: ReviewGradeRequest, options?: RequestOptions): Promise<ReviewGradeResponse> {
  const result = await post<ReviewGradeResponse>("/api/review/grade", body, options);
  notifyDueChanged();
  return result;
}

// ── Card-flip IDE ────────────────────────────────────────────────────────

/** GET /api/problems */
export function fetchProblems(options?: RequestOptions): Promise<ProblemsResponse> {
  return get("/api/problems", options);
}

/** GET /api/problems/{id} (id or LeetCode slug) */
export function fetchProblem(id: string, options?: RequestOptions): Promise<ProblemResponse> {
  return get(`/api/problems/${encodeURIComponent(id)}`, options);
}

/** GET /api/problems/{id}/solution (403 until the code stage was attempted) */
export function fetchSolution(id: string, options?: RequestOptions): Promise<ProblemSolutionResponse> {
  return get(`/api/problems/${encodeURIComponent(id)}/solution`, options);
}

/** POST /api/practice/evaluate: grade a Stage 1 (invariant) or Stage 2 (edge case) answer. */
export function evaluateStageAnswer(body: PracticeEvaluateRequest, options?: RequestOptions): Promise<PracticeEvaluateResponse> {
  return post("/api/practice/evaluate", body, options);
}

/** POST /api/practice/attempt: record a stage outcome (struggles queue iMessage drills). Fires DUE_CHANGED_EVENT. */
export async function recordAttempt(body: PracticeAttemptRequest, options?: RequestOptions): Promise<PracticeAttemptResponse> {
  const result = await post<PracticeAttemptResponse>("/api/practice/attempt", body, options);
  notifyDueChanged();
  return result;
}

// ── Voice sparring ───────────────────────────────────────────────────────

/** GET /api/behavioral */
export function fetchBehavioral(options?: RequestOptions): Promise<BehavioralResponse> {
  return get("/api/behavioral", options);
}

/** POST /api/spar/evaluate (LLM feedback can take ~10-25 s; show progress). */
export function evaluateSpar(body: SparEvaluateRequest, options?: RequestOptions): Promise<SparEvaluateResponse> {
  return post("/api/spar/evaluate", body, options);
}

/** GET /api/spar/sessions?limit= */
export function fetchSparSessions(limit?: number, options?: RequestOptions): Promise<SparSessionsResponse> {
  return get(`/api/spar/sessions${limit ? `?limit=${limit}` : ""}`, options);
}

// ── Resume grill ─────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** POST /api/grill/resume: a PDF, .txt or .md sent as base64 JSON → extracted text. */
export async function uploadResume(file: File, options: RequestOptions = {}): Promise<GrillResumeResponse> {
  const dataBase64 = toBase64(new Uint8Array(await file.arrayBuffer()));
  return post("/api/grill/resume", { fileName: file.name, mimeType: file.type, dataBase64 }, options);
}

/** POST /api/grill/next: the interviewer's next question (LLM, up to ~15 s). */
export function fetchGrillQuestion(body: GrillSessionRequest, options?: RequestOptions): Promise<GrillNextResponse> {
  return post("/api/grill/next", body, options);
}

/** POST /api/grill/report: panel verdict per claim (LLM, up to ~30 s). */
export function fetchGrillReport(body: GrillSessionRequest, options?: RequestOptions): Promise<GrillReport> {
  return post("/api/grill/report", body, options);
}

// ── Saved interview rounds ───────────────────────────────────────────────

/** GET /api/sessions?kind=&limit=: saved grill / AI-assisted / mock / design reports, newest first. */
export function fetchPracticeSessions(kind: "grill" | "bot" | "mock" | "design", limit = 20, options?: RequestOptions): Promise<PracticeSessionsResponse> {
  return get(`/api/sessions?kind=${kind}&limit=${limit}`, options);
}

// ── Mock loop ────────────────────────────────────────────────────────────

/** POST /api/mock/packet: the hiring-committee packet for a finished loop (LLM, up to ~30 s). */
export function fetchMockPacket(body: MockLoopInput, options?: RequestOptions): Promise<MockPacket> {
  return post("/api/mock/packet", body, options);
}

// ── Prepr Bot ────────────────────────────────────────────────────────────

/** POST /api/bot/chat (LLM, up to ~20 s). */
export function sendBotMessage(body: BotChatRequest, options?: RequestOptions): Promise<BotChatResponse> {
  return post("/api/bot/chat", body, options);
}

/** POST /api/bot/edit: a Cmd+K inline edit, returned as the complete updated file (LLM, up to ~20 s). */
export function requestInlineEdit(body: BotInlineEditRequest, options?: RequestOptions): Promise<BotInlineEditResponse> {
  return post("/api/bot/edit", body, options);
}

/** POST /api/bot/report (LLM, up to ~35 s). */
export function fetchBotReport(body: BotReportRequest, options?: RequestOptions): Promise<BotReportResponse> {
  return post("/api/bot/report", body, options);
}

// ── Server judge (Java / C++ / Go / TypeScript) ─────────────────────────

/** GET /api/judge/languages: which server-compiled languages this server can run. */
export function fetchJudgeLanguages(options?: RequestOptions): Promise<JudgeLanguagesResponse> {
  return get("/api/judge/languages", options);
}

/** POST /api/judge/run: compile + run on the server; returns raw per-test output (compare with judgeResults). */
export function runOnServer(body: JudgeRunRequest, options?: RequestOptions): Promise<JudgeRunResponse> {
  return post("/api/judge/run", body, options);
}

/** True for requests cancelled through their AbortSignal. */
export function isAbort(error: unknown): boolean {
  return error instanceof ApiError && error.code === "aborted";
}

/** User-facing message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
