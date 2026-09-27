import { proxyRejection } from "@/lib/server/proxy-guard";

/**
 * Runs on every path (no matcher): pages, RSC payloads, static assets and /api
 * only answer a loopback Host or the SYNAPSE_WEB_URL host, which blocks DNS
 * rebinding. See lib/server/proxy-guard.ts. Returning nothing lets the request
 * through untouched, so next.config.ts headers (the judge worker's CSP) still apply.
 */
export function proxy(request: Request): Response | undefined {
  return proxyRejection(request);
}
