/**
 * Fetchers for the dashboard/review feature's own additive routes under
 * /api/dashboard-review/*. Same error contract as lib/api.ts (rejects with
 * ApiError), so callers can use errorMessage() from there.
 */
import { ApiError, type RequestOptions } from "@/lib/api";
import type { ApiErrorBody, ReviewNextResponse, Tag } from "@/lib/types";
import type { ReviewActivityResponse } from "./activity-data";

export async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store", signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError(0, "aborted", "Request was cancelled.");
    throw new ApiError(0, "network", "Could not reach the Prepr server. Is it running?");
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const body = payload as Partial<ApiErrorBody> | null;
    if (body?.error && typeof body.error.message === "string") {
      throw new ApiError(response.status, body.error.code ?? "http_error", body.error.message, body.error.details);
    }
    throw new ApiError(response.status, "http_error", `Request failed (${response.status}).`);
  }
  return payload as T;
}

/** GET /api/dashboard-review/activity: reviews per day (30 buckets), split by surface. */
export function fetchReviewActivity(options?: RequestOptions): Promise<ReviewActivityResponse> {
  return getJson("/api/dashboard-review/activity", options);
}

export interface BonusQuery {
  tag?: Tag;
  exclude?: string[];
}

/**
 * GET /api/dashboard-review/bonus: the next never-seen card, ignoring the daily
 * new-card cap ("Study new cards" after the queue is empty). reason = "extra".
 */
export function fetchBonusCard(query: BonusQuery = {}, options?: RequestOptions): Promise<ReviewNextResponse> {
  const params = new URLSearchParams();
  if (query.tag) params.set("tag", query.tag);
  if (query.exclude?.length) params.set("exclude", query.exclude.join(","));
  const qs = params.toString();
  return getJson(`/api/dashboard-review/bonus${qs ? `?${qs}` : ""}`, options);
}

export function isAbort(error: unknown): boolean {
  return error instanceof ApiError && error.code === "aborted";
}
