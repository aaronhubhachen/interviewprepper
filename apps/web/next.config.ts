import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

/**
 * Nearest ancestor (starting at the process cwd) whose package.json declares
 * npm "workspaces". Works whether Next runs from apps/web (npm -w) or from the
 * repo root (`next build apps/web`), and avoids __dirname / import.meta, whose
 * availability depends on how Node loads next.config.ts.
 */
function findRepoRoot(start: string): string {
  for (let dir = path.resolve(start); ; dir = path.dirname(dir)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as { workspaces?: unknown };
      if (manifest.workspaces) return dir;
    } catch {
      // no package.json here; keep walking
    }
    if (path.dirname(dir) === dir) return path.resolve(start);
  }
}

const repoRoot = findRepoRoot(process.cwd());

/**
 * proxy.ts checks the Host header against SYNAPSE_WEB_URL (the opt-in LAN or
 * tunnel URL) but must not import @synapse/core, which is what loads the
 * repo-root .env. Copy that one value into process.env at startup. The shell
 * wins, nothing else from .env is loaded here, and no .env means loopback only.
 */
function exposeWebUrl(root: string): void {
  if (process.env.SYNAPSE_WEB_URL?.trim()) return;
  try {
    const value = parseEnv(fs.readFileSync(path.join(root, ".env"), "utf8")).SYNAPSE_WEB_URL?.trim();
    if (value) process.env.SYNAPSE_WEB_URL = value;
  } catch {
    // no readable .env: the proxy answers loopback hosts only
  }
}

exposeWebUrl(repoRoot);

const nextConfig: NextConfig = {
  // @synapse/core ships TypeScript source (no build step).
  transpilePackages: ["@synapse/core"],
  // Native addon: load with Node's require instead of bundling.
  serverExternalPackages: ["better-sqlite3"],
  // Monorepo: resolve and trace from the repo root so hoisted node_modules and
  // packages/core are in scope and Next does not warn about multiple lockfiles.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
};

export default nextConfig;
