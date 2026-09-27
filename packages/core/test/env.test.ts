import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findRepoRoot, parseConfig } from "../src/env";
import { completeJson, extractJson, isLlmConfigured, resolveLlmProfiles } from "../src/llm";
import { z } from "zod";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("findRepoRoot", () => {
  it("walks up to the workspace root from any package directory", () => {
    expect(findRepoRoot(path.join(ROOT, "packages", "core", "src"))).toBe(ROOT);
    expect(findRepoRoot(path.join(ROOT, "apps", "web"))).toBe(ROOT);
    expect(findRepoRoot(ROOT)).toBe(ROOT);
  });
});

describe("parseConfig", () => {
  it("applies documented defaults", () => {
    const config = parseConfig({}, ROOT);
    expect(config).toMatchObject({
      dbPath: path.join(ROOT, "data", "synapse.db"),
      webUserId: "me",
      webUrl: "http://localhost:3000",
      timezone: "America/Chicago",
      dayMs: 86_400_000,
      demoScale: false,
      activeHours: { startHour: 8, endHour: 22 },
      morningHour: 9,
      maxDailyPushes: 12,
      newPerDay: 8,
      tickMs: 30_000,
      probeTtlMs: 21_600_000,
      llmTimeoutMs: 12_000,
      llmDisabled: false,
    });
    expect(config.scheduler).toEqual({ dayMs: 86_400_000, relearnMs: 600_000 });
  });

  it("derives demo-scale settings from SYNAPSE_DAY_MS", () => {
    const config = parseConfig({ SYNAPSE_DAY_MS: "60000" }, ROOT);
    expect(config.demoScale).toBe(true);
    expect(config.scheduler.relearnMs).toBe(15_000);
    expect(config.probeTtlMs).toBe(15_000);
  });

  it("resolves a relative SYNAPSE_DB_PATH against the repo root and trims values", () => {
    const config = parseConfig(
      { SYNAPSE_DB_PATH: " data/demo.db ", SYNAPSE_WEB_URL: "https://synapse.example/", SYNAPSE_DISABLE_LLM: "true", SYNAPSE_TIMEZONE: "" },
      ROOT,
    );
    expect(config.dbPath).toBe(path.join(ROOT, "data", "demo.db"));
    expect(config.webUrl).toBe("https://synapse.example");
    expect(config.llmDisabled).toBe(true);
    expect(config.timezone).toBe("America/Chicago");
  });

  it("reports every invalid variable at once", () => {
    expect(() => parseConfig({ SYNAPSE_TIMEZONE: "Nowhere/City", SYNAPSE_ACTIVE_HOURS: "late", SYNAPSE_MORNING_HOUR: "30" }, ROOT)).toThrow(
      /SYNAPSE_TIMEZONE[\s\S]*SYNAPSE_ACTIVE_HOURS[\s\S]*SYNAPSE_MORNING_HOUR/,
    );
  });
});

describe("resolveLlmProfiles", () => {
  it("prefers Meta, then Groq, then OpenAI, each with its default model", () => {
    const profiles = resolveLlmProfiles({ OPENAI_API_KEY: "sk-o", GROQ_API_KEY: "gsk", META_MODEL_API_KEY: "LLM_m" });
    expect(profiles.map((p) => [p.provider, p.model, p.baseURL])).toEqual([
      ["meta", "muse-spark-1.3", "https://api.meta.ai/v1"],
      ["groq", "llama-3.3-70b-versatile", "https://api.groq.com/openai/v1"],
      ["openai", "gpt-4o", "https://api.openai.com/v1"],
    ]);
  });

  it("applies MODEL_NAME, MODEL_FALLBACK, and META_API_BASE_URL to the primary provider", () => {
    const profiles = resolveLlmProfiles({
      META_MODEL_API_KEY: "LLM_m",
      META_API_BASE_URL: "https://proxy.example/v1",
      MODEL_NAME: "muse-pro",
      MODEL_FALLBACK: "muse-lite, muse-pro",
      OPENAI_API_KEY: "sk-o",
    });
    expect(profiles.map((p) => `${p.provider}:${p.model}`)).toEqual(["meta:muse-pro", "meta:muse-lite", "openai:gpt-4o"]);
    expect(profiles[0]!.baseURL).toBe("https://proxy.example/v1");
  });

  it("is empty without keys or when disabled", () => {
    expect(resolveLlmProfiles({})).toEqual([]);
    expect(resolveLlmProfiles({ OPENAI_API_KEY: "  " })).toEqual([]);
    expect(resolveLlmProfiles({ OPENAI_API_KEY: "sk-o", SYNAPSE_DISABLE_LLM: "1" })).toEqual([]);
  });
});

describe("LLM plumbing", () => {
  it("extracts JSON from fenced or chatty replies", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a": [1, 2]}\n```')).toEqual({ a: [1, 2] });
    expect(extractJson('Sure! Here you go: {"note": "use {braces} and \\"quotes\\"", "n": 2} Hope it helps.')).toEqual({
      note: 'use {braces} and "quotes"',
      n: 2,
    });
    expect(extractJson("no json here")).toBeUndefined();
    const withFence = { reply: "Try:\n```python\nx = 1\n```" };
    expect(extractJson(JSON.stringify(withFence))).toEqual(withFence);
    expect(extractJson("```json\n" + JSON.stringify(withFence) + "\n```")).toEqual(withFence);
  });

  it("returns null instead of throwing when no model is available", async () => {
    expect(isLlmConfigured()).toBe(false);
    await expect(completeJson("system", "user", z.object({ ok: z.boolean() }))).resolves.toBeNull();
  });
});
