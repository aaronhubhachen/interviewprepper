import "server-only";

import type { ApiErrorBody } from "@/lib/types";

/** An error that maps to a JSON error response. Messages are shown to users; keep them safe. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, details?: Record<string, string>) =>
  new HttpError(400, "invalid_request", message, details);
export const notFound = (message: string) => new HttpError(404, "not_found", message);
export const forbidden = (message: string) => new HttpError(403, "forbidden", message);

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** JSON success response (never cached). */
export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    };
    return Response.json(body, { status: error.status, headers: NO_STORE });
  }
  // Log server-side only; the client gets a generic message (no stack traces, paths, or keys).
  console.error("[synapse/api] unhandled error:", error);
  const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong on our side. Please try again." } };
  return Response.json(body, { status: 500, headers: NO_STORE });
}

/**
 * Wraps a route handler so thrown HttpErrors become JSON 4xx responses and
 * anything else becomes a generic JSON 500.
 */
export function route<Ctx = unknown>(
  handler: (request: Request, context: Ctx) => Response | Promise<Response>,
): (request: Request, context: Ctx) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export type JsonObject = Record<string, unknown>;

/** Reads a JSON object body (default limit 64 KB). */
export async function readJson(request: Request, maxBytes = 64_000): Promise<JsonObject> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "payload_too_large", "Request body is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "payload_too_large", "Request body is too large.");
  if (!text.trim()) throw new HttpError(400, "invalid_json", "Expected a JSON body.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "invalid_json", "Expected a JSON object.");
  }
  return parsed as JsonObject;
}
