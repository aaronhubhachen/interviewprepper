import fs from "node:fs";
import path from "node:path";
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
