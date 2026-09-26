/**
 * Guards what can end up in the browser bundle. Walks the import graph from
 * every "use client" module and fails if it reaches server-only code or the
 * content registry (`@synapse/core/content` / `/browser` / the main entry hold
 * every answer key and reference solution; those stay on the server and reach
 * the client only through the stripped API/props serializers).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["app", "components", "lib"];

/** Core subpaths without Node code or answer keys. */
const ALLOWED_CORE = new Set([
  "@synapse/core/tags",
  "@synapse/core/grading",
  "@synapse/core/judge",
  "@synapse/core/sm2",
  "@synapse/core/tapback",
  "@synapse/core/text",
  "@synapse/core/time",
  "@synapse/core/transcript",
]);

const FORBIDDEN_EXTERNAL = [/^better-sqlite3$/, /^openai$/, /^dotenv$/, /^server-only$/, /^node:/, /^(fs|path|os|child_process)$/];

function listSources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSources(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** True when every specifier of an import/export clause is type-only (TS and SWC drop the statement). */
function typeOnly(clause: string): boolean {
  const trimmed = clause.trim();
  if (/^type\b/.test(trimmed)) return true;
  const braces = /^\{([\s\S]*)\}$/.exec(trimmed);
  if (!braces) return false;
  const specifiers = braces[1]!
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return specifiers.length > 0 && specifiers.every((part) => /^type\s/.test(part));
}

/** Runtime import specifiers of a module: static imports/re-exports, side-effect imports, dynamic import(). */
function runtimeImports(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/^\s*(?:import|export)\s+([^;'"]*?)\s+from\s+["']([^"']+)["']/gm)) {
    if (!typeOnly(match[1]!)) found.push(match[2]!);
  }
  for (const match of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) found.push(match[1]!);
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) found.push(match[1]!);
  return found;
}

function resolveLocal(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith("@/") ? path.join(WEB, specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}

function isClientEntry(source: string): boolean {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(source);
}

const sources = SOURCE_DIRS.flatMap((dir) => listSources(path.join(WEB, dir)));
const clientEntries = sources.filter((file) => isClientEntry(fs.readFileSync(file, "utf8")));

/** Every module reachable from `entry`, with the external specifiers each one imports at runtime. */
function reachable(entry: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const visit = (file: string) => {
    if (graph.has(file)) return;
    const external: string[] = [];
    graph.set(file, external);
    for (const specifier of runtimeImports(fs.readFileSync(file, "utf8"))) {
      if (specifier.startsWith(".") || specifier.startsWith("@/")) {
        const resolved = resolveLocal(file, specifier);
        if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${path.relative(WEB, file)}`);
        if (/\.(ts|tsx)$/.test(resolved)) visit(resolved);
      } else {
        external.push(specifier);
      }
    }
  };
  visit(entry);
  return graph;
}

const rel = (file: string) => path.relative(WEB, file).split(path.sep).join("/");

describe("client bundle", () => {
  it("has client components to check", () => {
    expect(clientEntries.length).toBeGreaterThan(20);
  });

  it.each(clientEntries.map((file) => [rel(file), file]))(
    "%s never reaches server-only code or the answer-key registry",
    (_name, entry) => {
      const violations: string[] = [];
      for (const [file, external] of reachable(entry)) {
        const name = rel(file);
        if (name.startsWith("lib/server/") || name.startsWith("app/api/")) violations.push(`${name} (server module)`);
        for (const specifier of external) {
          if (specifier.startsWith("@synapse/core") && !ALLOWED_CORE.has(specifier)) violations.push(`${name} → ${specifier}`);
          if (FORBIDDEN_EXTERNAL.some((pattern) => pattern.test(specifier))) violations.push(`${name} → ${specifier}`);
        }
      }
      expect(violations).toEqual([]);
    },
  );
});
