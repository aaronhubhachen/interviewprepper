/**
 * Content-Security-Policy for the judge worker (public/judge-worker.js).
 *
 * The worker runs code the user pasted: `new Function` for JavaScript, `exec`
 * inside Pyodide for Python (where `js.fetch` and the WebSocket-backed `socket`
 * module both exist). It is served from the app's own origin. Without a policy,
 * that code could read every unauthenticated /api route and post the results to
 * any host. A dedicated worker enforces the CSP on its OWN script response, not
 * the page's, so next.config.ts serves this policy on /judge-worker.js only, via
 * `withJudgeWorkerCsp`:
 *
 * - `default-src 'none'` and `worker-src 'none'`: no nested or blob: workers, and
 *   no data:/blob: scripts.
 * - `script-src`: the Pyodide CDN folder (importScripts of pyodide.js and
 *   pyodide.asm.js), `'unsafe-eval'` for `new Function`, and `'wasm-unsafe-eval'`
 *   for Pyodide's WebAssembly. This list also restricts dynamic `import()`, which
 *   the worker cannot block by itself.
 * - `connect-src`: only the Pyodide CDN folder (wasm, stdlib zip, lock file).
 *   `'self'` is left out on purpose. That is what blocks /api, and it also covers
 *   fetch, XHR, WebSocket and EventSource.
 *
 * This module has no runtime imports, so next.config.ts can import it through
 * Next's config require hook. csp.test.ts checks that core's PYODIDE_INDEX_URL
 * stays inside PYODIDE_CDN_SOURCE.
 */
import type { NextConfig } from "next";

/** Same-origin URL the judge worker script is served from (apps/web/public). */
export const JUDGE_WORKER_URL = "/judge-worker.js";

/** CSP source for every Pyodide version on jsDelivr (a trailing "/" matches the whole folder). */
export const PYODIDE_CDN_SOURCE = "https://cdn.jsdelivr.net/pyodide/";

export const JUDGE_WORKER_CSP = [
  "default-src 'none'",
  `script-src ${PYODIDE_CDN_SOURCE} 'unsafe-eval' 'wasm-unsafe-eval'`,
  `connect-src ${PYODIDE_CDN_SOURCE}`,
  "worker-src 'none'",
].join("; ");

type HeaderRule = Awaited<ReturnType<NonNullable<NextConfig["headers"]>>>[number];

export const JUDGE_WORKER_HEADER_RULE: HeaderRule = {
  source: JUDGE_WORKER_URL,
  headers: [{ key: "Content-Security-Policy", value: JUDGE_WORKER_CSP }],
};

/**
 * Returns a copy of `config` whose `headers()` serves JUDGE_WORKER_CSP on the
 * judge worker. Any existing header rules are kept. The judge rule goes LAST
 * because, when two rules set the same key on one path, Next uses the later one,
 * so a site-wide CSP cannot loosen the worker's policy.
 */
export function withJudgeWorkerCsp(config: NextConfig): NextConfig {
  const base = config.headers;
  return {
    ...config,
    async headers() {
      const rules = base ? await base.call(config) : [];
      return [...rules, JUDGE_WORKER_HEADER_RULE];
    },
  };
}
