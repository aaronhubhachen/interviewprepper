import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "../package.json"), "utf8")) as { exports: Record<string, string> };

/** Every non-type import specifier reachable from `entry`, following relative imports. */
function reachableImports(entry: string): { files: Set<string>; external: Set<string> } {
  const files = new Set<string>();
  const external = new Set<string>();
  const visit = (file: string) => {
    if (files.has(file)) return;
    files.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)) {
      const specifier = match[1]!;
      if (!specifier.startsWith(".")) {
        external.add(specifier);
        continue;
      }
      const base = path.resolve(path.dirname(file), specifier);
      const resolved = [`${base}.ts`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
      if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${file}`);
      visit(resolved);
    }
  };
  visit(entry);
  return { files, external };
}

const BROWSER_ENTRIES = Object.entries(manifest.exports).filter(([subpath]) => subpath !== ".");

describe("browser-safe entry points", () => {
  it.each(BROWSER_ENTRIES)("%s imports no Node, SQLite, dotenv, or OpenAI code", (_subpath, target) => {
    const { files, external } = reachableImports(path.resolve(SRC, "..", target));
    expect([...external]).toEqual([]);
    const serverModules = [...files].map((file) => path.relative(SRC, file).replace(/\\/g, "/")).filter((file) => /^(store|env|llm|evaluate|spar)\b/.test(file));
    expect(serverModules).toEqual([]);
  });
});
