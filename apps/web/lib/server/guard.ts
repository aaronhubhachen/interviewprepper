import "server-only";

/**
 * Request guards for a single-user app that must only answer its owner's own
 * browser. There is no login, so the checks are about where a request comes from:
 *
 * - Host allowlist: the Host header must be a loopback name (or the host of
 *   SYNAPSE_WEB_URL, for an opted-in LAN or tunnel URL). This defeats DNS
 *   rebinding, where an attacker's domain resolves to 127.0.0.1 and the
 *   browser treats the attacker's page as same-origin with this server.
 * - Same-origin: API requests from another site (Sec-Fetch-Site cross-site or
 *   same-site, or an Origin that is not this server) are refused, so a page
 *   the owner visits cannot drive the API (CSRF).
 *
 * Pure (no store or env access): callers pass the configured web URL lazily,
 * so this also works from a Next proxy. Binding the server to 127.0.0.1 is
 * still what keeps other machines out; a LAN client can forge any header.
 */

export interface RequestRejection {
  status: number;
  code: string;
  message: string;
}

/** Hostnames that always reach this server (`next dev -H 127.0.0.1` / http://localhost:3000). */
const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Sec-Fetch-Site values a same-origin page or a typed-in URL produce. */
const SAME_ORIGIN_FETCH_SITES: ReadonlySet<string> = new Set(["same-origin", "none"]);

/** Resolves the configured public web URL (SYNAPSE_WEB_URL); may return null or throw. */
export type WebUrlSource = () => string | null | undefined;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function configuredUrl(webUrl: WebUrlSource): URL | null {
  try {
    const raw = webUrl()?.trim();
    return raw ? parseUrl(raw) : null;
  } catch {
    return null;
  }
}

/** The request's Host header (host[:port]); falls back to the URL for Requests built without one (tests). */
export function requestHost(request: Request): string {
  const header = request.headers.get("host")?.trim();
  if (header) return header.toLowerCase();
  return parseUrl(request.url)?.host.toLowerCase() ?? "";
}

function hostnameOf(host: string): string | null {
  if (!host) return null;
  return parseUrl(`http://${host}`)?.hostname.toLowerCase() ?? null;
}

/** 403 unless the Host header names this server (loopback or the SYNAPSE_WEB_URL host). */
export function hostRejection(request: Request, webUrl: WebUrlSource): RequestRejection | null {
  const hostname = hostnameOf(requestHost(request));
  if (hostname && LOOPBACK_HOSTNAMES.has(hostname)) return null;
  const configured = configuredUrl(webUrl);
  if (hostname && configured && configured.hostname.toLowerCase() === hostname) return null;
  return {
    status: 403,
    code: "forbidden_host",
    message: "Prepr only answers on localhost. Set SYNAPSE_WEB_URL to open it from another address.",
  };
}

/** 403 when the browser says the request came from another site or origin. */
export function crossSiteRejection(request: Request, webUrl: WebUrlSource): RequestRejection | null {
  const rejection: RequestRejection = {
    status: 403,
    code: "cross_site",
    message: "Cross-site requests to the Prepr API are not allowed.",
  };

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && !SAME_ORIGIN_FETCH_SITES.has(fetchSite)) return rejection;

  const originHeader = request.headers.get("origin")?.trim();
  if (!originHeader) return null;
  const origin = parseUrl(originHeader);
  // "null" (sandboxed iframes, file://, some redirects) never comes from this app.
  if (!origin || origin.origin === "null") return rejection;
  if (origin.host.toLowerCase() === requestHost(request)) return null;
  const configured = configuredUrl(webUrl);
  if (configured && configured.origin === origin.origin) return null;
  return rejection;
}
