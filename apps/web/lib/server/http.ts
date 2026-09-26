import "server-only";

import type { ApiErrorBody } from "@/lib/types";
import { crossSiteRejection, hostRejection, type RequestRejection } from "./guard";
import { webUrl } from "./store";

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
export const tooManyRequests = (message: string) => new HttpError(429, "rate_limited", message);

const payloadTooLarge = () => new HttpError(413, "payload_too_large", "Request body is too large.");

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

const SAFE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

function isJsonContentType(request: Request): boolean {
  const mediaType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

const rejectionError = (rejection: RequestRejection) => new HttpError(rejection.status, rejection.code, rejection.message);

/**
 * Refuses requests this single-user API must never serve: a Host that is not
 * this server (DNS rebinding), another site's page (CSRF), or a state-changing
 * request that is not application/json. The JSON rule matters for CSRF: a
 * cross-site page can send text/plain or form bodies without a CORS preflight,
 * but not application/json, and this app sends no CORS headers.
 */
export function assertAllowedRequest(request: Request): void {
  const host = hostRejection(request, webUrl);
  if (host) throw rejectionError(host);
  const crossSite = crossSiteRejection(request, webUrl);
  if (crossSite) throw rejectionError(crossSite);
  if (!SAFE_METHODS.has(request.method.toUpperCase()) && !isJsonContentType(request)) {
    throw new HttpError(415, "unsupported_media_type", "Send the request body as application/json.");
  }
}

/**
 * Wraps a route handler: checks the request with assertAllowedRequest, then
 * turns thrown HttpErrors into JSON 4xx responses and anything else into a
 * generic JSON 500.
 */
export function route<Ctx = unknown>(
  handler: (request: Request, context: Ctx) => Response | Promise<Response>,
): (request: Request, context: Ctx) => Promise<Response> {
  return async (request, context) => {
    try {
      assertAllowedRequest(request);
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export type JsonObject = Record<string, unknown>;

/**
 * Reads the body as UTF-8, counting bytes as they stream in and cancelling the
 * upload as soon as it passes maxBytes. Content-Length is only an early hint:
 * chunked uploads have none, and request.text() would buffer them in full.
 */
async function readBodyText(request: Request, maxBytes: number): Promise<string> {
  const header = request.headers.get("content-length");
  if (header !== null) {
    if (!/^\d+$/.test(header.trim())) throw badRequest("Content-Length must be a number of bytes.");
    if (Number(header) > maxBytes) throw payloadTooLarge();
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw payloadTooLarge();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Reads a JSON object body (default limit 64 KB). */
export async function readJson(request: Request, maxBytes = 64_000): Promise<JsonObject> {
  const text = await readBodyText(request, maxBytes);
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
