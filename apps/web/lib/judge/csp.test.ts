import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { NextConfig } from "next";
import { PYODIDE_INDEX_URL } from "@synapse/core/judge";
import { JUDGE_WORKER_URL as CLIENT_WORKER_URL } from "./client";
import { JUDGE_WORKER_CSP, JUDGE_WORKER_HEADER_RULE, JUDGE_WORKER_URL, PYODIDE_CDN_SOURCE, withJudgeWorkerCsp } from "./csp";

const here = path.dirname(fileURLToPath(import.meta.url));

function directives(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) map.set(name, sources);
  }
  return map;
}

/** CSP3 source matching for the host-source forms this policy uses (scheme://host/path, "/"-terminated = prefix). */
function allows(sources: string[], url: string, origin = "http://localhost:3000"): boolean {
  const target = new URL(url, origin);
  return sources.some((source) => {
    if (source.startsWith("'")) return source === "'self'" && target.origin === origin;
    const allowed = new URL(source);
    if (allowed.origin !== target.origin) return false;
    return allowed.pathname.endsWith("/") ? target.pathname.startsWith(allowed.pathname) : target.pathname === allowed.pathname;
  });
}

describe("judge worker CSP", () => {
  const policy = directives(JUDGE_WORKER_CSP);

  it("is served for the worker the client actually spawns", () => {
    expect(CLIENT_WORKER_URL).toBe(JUDGE_WORKER_URL);
    expect(JUDGE_WORKER_HEADER_RULE).toEqual({
      source: JUDGE_WORKER_URL,
      headers: [{ key: "Content-Security-Policy", value: JUDGE_WORKER_CSP }],
    });
    expect(fs.existsSync(path.join(here, "..", "..", "public", JUDGE_WORKER_URL.slice(1)))).toBe(true);
  });

  it("denies by default, including nested workers", () => {
    expect(policy.get("default-src")).toEqual(["'none'"]);
    expect(policy.get("worker-src")).toEqual(["'none'"]);
  });

  it("blocks the app's own /api and every other host for fetch, XHR and WebSocket", () => {
    const connect = policy.get("connect-src")!;
    expect(connect).toEqual([PYODIDE_CDN_SOURCE]);
    for (const url of ["/api/link", "/api/stats", "/api/spar/sessions", "http://localhost:3000/api/review/grade", "https://evil.example/collect", "wss://evil.example/"]) {
      expect(allows(connect, url), url).toBe(false);
    }
  });

  it("allows only the Pyodide CDN folder, eval for new Function, and wasm for Pyodide as scripts", () => {
    const script = policy.get("script-src")!;
    expect([...script].sort()).toEqual([PYODIDE_CDN_SOURCE, "'unsafe-eval'", "'wasm-unsafe-eval'"].sort());
    expect(allows(script, "/judge-worker.js")).toBe(false);
    expect(allows(script, "https://cdn.jsdelivr.net/npm/anything/x.js")).toBe(false);
  });

  it("still lets Pyodide load everything from core's pinned index URL", () => {
    expect(PYODIDE_INDEX_URL.startsWith(PYODIDE_CDN_SOURCE)).toBe(true);
    expect(allows(policy.get("script-src")!, `${PYODIDE_INDEX_URL}pyodide.js`)).toBe(true);
    expect(allows(policy.get("script-src")!, `${PYODIDE_INDEX_URL}pyodide.asm.js`)).toBe(true);
    for (const file of ["pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
      expect(allows(policy.get("connect-src")!, `${PYODIDE_INDEX_URL}${file}`), file).toBe(true);
    }
  });

  it("never names 'self', wildcards, or blob:/data: sources", () => {
    for (const [name, sources] of policy) {
      for (const source of sources) expect(source, `${name} ${source}`).not.toMatch(/^('self'|\*|blob:|data:|https?:$|wss?:$)/);
    }
  });

  it("has no runtime imports, so next.config.ts can load it through Next's config require hook", () => {
    const source = fs
      .readFileSync(path.join(here, "csp.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const imports = [...source.matchAll(/^\s*import\s+([^;]*?)\s+from\s+["'][^"']+["']/gm)].map((match) => match[1]!);
    expect(imports.every((clause) => /^type\s/.test(clause))).toBe(true);
    expect(source).not.toMatch(/\brequire\(|\bimport\(/);
  });
});

describe("withJudgeWorkerCsp", () => {
  it("adds the worker rule to a config without headers and keeps everything else", async () => {
    const base: NextConfig = { poweredByHeader: false, transpilePackages: ["@synapse/core"] };
    const config = withJudgeWorkerCsp(base);
    expect(config.poweredByHeader).toBe(false);
    expect(config.transpilePackages).toEqual(["@synapse/core"]);
    expect(await config.headers!()).toEqual([JUDGE_WORKER_HEADER_RULE]);
    expect(base.headers).toBeUndefined();
  });

  it("keeps existing rules and puts the worker rule last, so a site-wide CSP cannot loosen it", async () => {
    const siteWide = { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: "default-src 'self'" }] };
    const config = withJudgeWorkerCsp({
      async headers() {
        return [siteWide];
      },
    });
    const rules = await config.headers!();
    expect(rules).toEqual([siteWide, JUDGE_WORKER_HEADER_RULE]);
    const last = rules.filter((rule) => rule.source === "/:path*" || rule.source === JUDGE_WORKER_URL).at(-1);
    expect(last?.headers).toContainEqual({ key: "Content-Security-Policy", value: JUDGE_WORKER_CSP });
  });
});
