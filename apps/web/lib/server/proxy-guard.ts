import "server-only";

import type { ApiErrorBody } from "@/lib/types";
import { hostRejection, type WebUrlSource } from "./guard";

/**
 * Host allowlist for every path, for apps/web/proxy.ts. route() already checks
 * the Host on /api, but pages render private data into their HTML and RSC
 * payload (/spar embeds recent transcripts, the dashboard shows the link
 * code), and Next's own cross-site dev check only covers /_next and /__nextjs.
 * Without this a DNS-rebinding page could read those pages.
 *
 * Proxy code must not reach the store or @synapse/core, so the configured web
 * URL comes straight from process.env (next.config.ts copies SYNAPSE_WEB_URL
 * from the repo-root .env at startup). Unset means loopback only.
 *
 * This does not stop other machines on the LAN: they can send any Host header.
 * Binding the server to 127.0.0.1 (`next dev -H 127.0.0.1`) is what keeps them out.
 */
export const envWebUrl: WebUrlSource = () => process.env.SYNAPSE_WEB_URL;

/** A 403 JSON response for a request whose Host is not this server; undefined lets the request through. */
export function proxyRejection(request: Request, webUrl: WebUrlSource = envWebUrl): Response | undefined {
  const rejection = hostRejection(request, webUrl);
  if (!rejection) return undefined;
  const body: ApiErrorBody = { error: { code: rejection.code, message: rejection.message } };
  return Response.json(body, { status: rejection.status, headers: { "Cache-Control": "no-store" } });
}
