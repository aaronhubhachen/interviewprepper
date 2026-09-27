/**
 * Typed client for the Prepr web API (apps/web/app/api). The web app is the single
 * source of truth: the phone reads and writes the same SQLite store over HTTP.
 */
import type {
  ApiErrorBody,
  BehavioralResponse,
  DueResponse,
  GrillNextResponse,
  GrillReport,
  GrillResumeResponse,
  GrillSessionRequest,
  LinkResponse,
  PracticeAttemptRequest,
  PracticeAttemptResponse,
  PracticeEvaluateRequest,
  PracticeEvaluateResponse,
  ProblemResponse,
  ProblemsResponse,
  ReviewEvaluateRequest,
  ReviewEvaluateResponse,
  ReviewGradeRequest,
  ReviewGradeResponse,
  ReviewNextResponse,
  SparEvaluateRequest,
  SparEvaluateResponse,
  SparSessionsResponse,
  StatsResponse,
  Tag,
} from '@web/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let baseUrl = 'http://localhost:3000';

export function setBaseUrl(url: string): void {
  baseUrl = url;
}

export function getBaseUrl(): string {
  return baseUrl;
}

export function webUrl(path: string): string {
  return `${baseUrl}${path}`;
}

const TIMEOUT_MS = 60_000;

function isErrorBody(value: unknown): value is ApiErrorBody {
  return Boolean(value && typeof value === 'object' && 'error' in value && typeof (value as ApiErrorBody).error?.message === 'string');
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: BodyInit, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Accept: 'application/json', ...headers },
      body,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'network', `Can't reach the Prepr server at ${baseUrl}. Is it running with npm run dev:lan and SYNAPSE_WEB_URL set to this address?`);
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    if (isErrorBody(payload)) throw new ApiError(response.status, payload.error.code, payload.error.message);
    throw new ApiError(response.status, 'http_error', `Request failed (${response.status}).`);
  }
  return payload as T;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) =>
  request<T>('POST', path, JSON.stringify(body), { 'Content-Type': 'application/json' });

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

// Dashboard
export const fetchStats = () => get<StatsResponse>('/api/stats');
export const fetchDue = () => get<DueResponse>('/api/review/due');
export const fetchLink = () => get<LinkResponse>('/api/link');
export const setAgentPaused = (paused: boolean) => post<LinkResponse>('/api/link', { paused });

// Flashcard review
export function fetchNextCard(query: { tag?: Tag; exclude?: string[] } = {}) {
  const params = new URLSearchParams();
  if (query.tag) params.set('tag', query.tag);
  if (query.exclude?.length) params.set('exclude', query.exclude.join(','));
  const qs = params.toString();
  return get<ReviewNextResponse>(`/api/review/next${qs ? `?${qs}` : ''}`);
}
export const evaluateCardAnswer = (body: ReviewEvaluateRequest) => post<ReviewEvaluateResponse>('/api/review/evaluate', body);
export const gradeCard = (body: ReviewGradeRequest) => post<ReviewGradeResponse>('/api/review/grade', body);

// Practice (text stages; the code stage opens the web IDE)
export const fetchProblems = () => get<ProblemsResponse>('/api/problems');
export const fetchProblem = (id: string) => get<ProblemResponse>(`/api/problems/${encodeURIComponent(id)}`);
export const evaluateStageAnswer = (body: PracticeEvaluateRequest) => post<PracticeEvaluateResponse>('/api/practice/evaluate', body);
export const recordAttempt = (body: PracticeAttemptRequest) => post<PracticeAttemptResponse>('/api/practice/attempt', body);

// Behavioral sparring
export const fetchBehavioral = () => get<BehavioralResponse>('/api/behavioral');
export const evaluateSpar = (body: SparEvaluateRequest) => post<SparEvaluateResponse>('/api/spar/evaluate', body);
export const fetchSparSessions = (limit = 20) => get<SparSessionsResponse>(`/api/spar/sessions?limit=${limit}`);

// Resume grill
function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError(0, 'read_failed', "Couldn't read that file."));
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.readAsDataURL(blob);
  });
}

/** The server only accepts JSON on mutating routes (CSRF rule), so the file travels as base64. */
export async function uploadResume(file: { uri: string; name: string; mimeType?: string }) {
  const blob = await (await fetch(file.uri)).blob();
  const dataBase64 = await readAsBase64(blob);
  return post<GrillResumeResponse>('/api/grill/resume', { fileName: file.name, mimeType: file.mimeType ?? '', dataBase64 });
}
export const fetchGrillQuestion = (body: GrillSessionRequest) => post<GrillNextResponse>('/api/grill/next', body);
export const fetchGrillReport = (body: GrillSessionRequest) => post<GrillReport>('/api/grill/report', body);
