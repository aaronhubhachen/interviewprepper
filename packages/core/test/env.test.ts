import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findRepoRoot, parseConfig } from "../src/env";
import { completeJson, completionParams, extractJson, isLlmConfigured, isOpenAiReasoningModel, resolveLlmProfiles } from "../src/llm";
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

  it("reads flags case-insensitively, like the LLM kill switch does", () => {
    for (const value of ["TRUE", "True", "Yes", " ON ", "1"]) {
      expect(parseConfig({ SYNAPSE_DISABLE_LLM: value }, ROOT).llmDisabled).toBe(true);
      expect(resolveLlmProfiles({ OPENAI_API_KEY: "sk-o", SYNAPSE_DISABLE_LLM: value })).toEqual([]);
    }
    for (const value of ["FALSE", "Off", "no", "0"]) expect(parseConfig({ SYNAPSE_DISABLE_LLM: value }, ROOT).llmDisabled).toBe(false);
    expect(() => parseConfig({ SYNAPSE_DISABLE_LLM: "maybe" }, ROOT)).toThrow(/SYNAPSE_DISABLE_LLM/);
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
  });

  it("finds the JSON after braces in prose or reasoning, and tolerates trailing commas", () => {
    expect(extractJson('Here is the grade for the answer {hash map + list}:\n{"verdict":"correct","feedback":"ok"}')).toEqual({
      verdict: "correct",
      feedback: "ok",
    });
    expect(extractJson('<think>the key {map} is</think>{"verdict":"partial","nailed":[]}')).toEqual({ verdict: "partial", nailed: [] });
    expect(extractJson('{"verdict":"correct","feedback":"ok",}')).toEqual({ verdict: "correct", feedback: "ok" });
    expect(extractJson('{"nailed":["a",],"missed":[]}')).toEqual({ nailed: ["a"], missed: [] });
    expect(extractJson('Sure {"outer": {"inner": 1}} done')).toEqual({ outer: { inner: 1 } });
  });

  it("sends OpenAI reasoning models max_completion_tokens and no temperature", () => {
    expect(completionParams({ provider: "openai", model: "o4-mini" }, { temperature: 0.2, maxTokens: 900 })).toEqual({
      max_completion_tokens: 900,
      reasoning_effort: "low",
    });
    expect(completionParams({ provider: "openai", model: "gpt-5-mini" }, {})).not.toHaveProperty("temperature");
    expect(completionParams({ provider: "openai", model: "gpt-4o" }, { temperature: 0.2 })).toEqual({ temperature: 0.2, max_tokens: 2500 });
    expect(completionParams({ provider: "groq", model: "llama-3.3-70b-versatile" }, {})).toEqual({ temperature: 0.3, max_tokens: 2500 });
    expect(completionParams({ provider: "meta", model: "muse-spark-1.3" }, { reasoningEffort: "medium" })).toEqual({
      temperature: 0.3,
      max_tokens: 2500,
      reasoning_effort: "medium",
    });
    expect(isOpenAiReasoningModel({ provider: "groq", model: "o3" })).toBe(false);
  });

  it("returns null instead of throwing when no model is available", async () => {
    expect(isLlmConfigured()).toBe(false);
    await expect(completeJson("system", "user", z.object({ ok: z.boolean() }))).resolves.toBeNull();
  });

  it("never reaches a model under vitest, even with a key set and the kill switch off", async () => {
    const saved = { key: process.env.META_MODEL_API_KEY, disable: process.env.SYNAPSE_DISABLE_LLM };
    process.env.META_MODEL_API_KEY = "test-key-that-must-never-be-used";
    process.env.SYNAPSE_DISABLE_LLM = "0";
    try {
      expect(isLlmConfigured()).toBe(false);
      const started = Date.now();
      await expect(completeJson("system", "user", z.object({ ok: z.boolean() }))).resolves.toBeNull();
      expect(Date.now() - started).toBeLessThan(250);
    } finally {
      if (saved.key === undefined) delete process.env.META_MODEL_API_KEY;
      else process.env.META_MODEL_API_KEY = saved.key;
      if (saved.disable === undefined) delete process.env.SYNAPSE_DISABLE_LLM;
      else process.env.SYNAPSE_DISABLE_LLM = saved.disable;
    }
  });
});
