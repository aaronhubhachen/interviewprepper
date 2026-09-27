import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextConfig } from "next";
import { JUDGE_WORKER_CSP, JUDGE_WORKER_URL } from "@/lib/judge/csp";
import { proxy } from "../proxy";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * next.config.ts runs exposeWebUrl() on import. A SYNAPSE_WEB_URL already in the
 * environment wins, so setting one first keeps the test from reading the real
 * repo-root .env, and lets it check the LAN dev-origin opt-in.
 */
const LAN_URL = "http://192.168.1.20:3000";
let savedWebUrl: string | undefined;
let nextConfig: NextConfig;

beforeAll(async () => {
  savedWebUrl = process.env.SYNAPSE_WEB_URL;
  process.env.SYNAPSE_WEB_URL = LAN_URL;
  nextConfig = (await import("../next.config")).default;
});

afterAll(() => {
  if (savedWebUrl === undefined) delete process.env.SYNAPSE_WEB_URL;
  else process.env.SYNAPSE_WEB_URL = savedWebUrl;
});

describe("next.config.ts", () => {
  it("serves the judge worker with JUDGE_WORKER_CSP", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const matching = rules.filter((rule) => rule.source === JUDGE_WORKER_URL || rule.source === "/:path*");
    expect(matching.at(-1)?.headers).toContainEqual({ key: "Content-Security-Policy", value: JUDGE_WORKER_CSP });
  });

  it("keeps the monorepo settings the app depends on", () => {
    expect(nextConfig.transpilePackages).toContain("@synapse/core");
    expect(nextConfig.serverExternalPackages).toContain("better-sqlite3");
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("allows dev resources from the opted-in SYNAPSE_WEB_URL host only", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["192.168.1.20"]);
  });
});

describe("package.json scripts", () => {
  const scripts = (JSON.parse(readFileSync(path.join(webRoot, "package.json"), "utf8")) as { scripts: Record<string, string> })
    .scripts;

  it("bind next dev and next start to loopback by default", () => {
    expect(scripts.dev).toBe("next dev -H 127.0.0.1");
    expect(scripts.start).toBe("next start -H 127.0.0.1");
  });

  it("keep LAN binding behind explicit :lan scripts", () => {
    expect(scripts["dev:lan"]).toBe("next dev -H 0.0.0.0");
    expect(scripts["start:lan"]).toBe("next start -H 0.0.0.0");
    for (const [name, command] of Object.entries(scripts)) {
      if (!name.endsWith(":lan")) expect(command, name).not.toContain("0.0.0.0");
    }
  });
});

describe("proxy.ts", () => {
  it("refuses a foreign Host on every path, including the judge worker", async () => {
    for (const pathname of ["/", "/spar", JUDGE_WORKER_URL, "/api/stats"]) {
      const response = proxy(new Request(`http://evil.example${pathname}`, { headers: { host: "evil.example" } }));
      expect(response?.status, pathname).toBe(403);
      expect(((await response?.json()) as { error: { code: string } }).error.code).toBe("forbidden_host");
    }
  });

  it("lets loopback and the SYNAPSE_WEB_URL host through untouched", () => {
    for (const host of ["localhost:3000", "127.0.0.1:3000", "192.168.1.20:3000"]) {
      expect(proxy(new Request(`http://${host}${JUDGE_WORKER_URL}`, { headers: { host } })), host).toBeUndefined();
    }
  });
});
