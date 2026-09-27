import OpenAI from "openai";
import type { z } from "zod";
import { getConfig, loadEnv } from "./env";

export type LlmProvider = "meta" | "groq" | "openai";

export interface LlmProfile {
  provider: LlmProvider;
  apiKey: string;
  baseURL: string;
  model: string;
}

type Env = Record<string, string | undefined>;

const DEFAULT_TIMEOUT_MS = 12_000;

interface ProviderSpec {
  provider: LlmProvider;
  keyVar: string;
  baseURL: (env: Env) => string;
  model: string;
}

/** Precedence order: Meta Muse, then Groq, then OpenAI. */
const PROVIDERS: readonly ProviderSpec[] = [
  {
    provider: "meta",
    keyVar: "META_MODEL_API_KEY",
    baseURL: (env) => env.META_API_BASE_URL?.trim() || "https://api.meta.ai/v1",
    model: "muse-spark-1.3",
  },
  {
    provider: "groq",
    keyVar: "GROQ_API_KEY",
    baseURL: () => "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    provider: "openai",
    keyVar: "OPENAI_API_KEY",
    baseURL: () => "https://api.openai.com/v1",
    model: "gpt-4o",
  },
];

function isTruthy(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

/**
 * Ordered attempt chain: the primary provider with MODEL_NAME (or its default),
 * then each comma-separated MODEL_FALLBACK on the same provider, then every other
 * configured provider with its default model. Empty when no key is set or
 * SYNAPSE_DISABLE_LLM is on.
 */
export function resolveLlmProfiles(env: Env): LlmProfile[] {
  if (isTruthy(env.SYNAPSE_DISABLE_LLM)) return [];
  const configured = PROVIDERS.flatMap((spec) => {
    const apiKey = env[spec.keyVar]?.trim();
    return apiKey ? [{ provider: spec.provider, apiKey, baseURL: spec.baseURL(env), model: spec.model }] : [];
  });
  const [primary, ...others] = configured;
  if (!primary) return [];

  const fallbackModels = (env.MODEL_FALLBACK ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  const chain: LlmProfile[] = [
    { ...primary, model: env.MODEL_NAME?.trim() || primary.model },
    ...fallbackModels.map((model) => ({ ...primary, model })),
    ...others,
  ];
  const seen = new Set<string>();
  return chain.filter((profile) => {
    const key = `${profile.provider}:${profile.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * True inside any Vitest worker. Tests must never reach a real model, even when
 * vitest runs without a workspace config (whose env sets SYNAPSE_DISABLE_LLM=1)
 * and the repo .env holds a real key.
 */
function runningUnderTest(): boolean {
  return Boolean(process.env.VITEST);
}

function activeProfiles(): LlmProfile[] {
  if (runningUnderTest()) return [];
  loadEnv();
  return resolveLlmProfiles(process.env);
}

export function isLlmConfigured(): boolean {
  return activeProfiles().length > 0;
}

/** Safe to show in a UI: never includes the key. */
export function llmStatus(): { configured: boolean; provider?: LlmProvider; model?: string } {
  const primary = activeProfiles()[0];
  return primary ? { configured: true, provider: primary.provider, model: primary.model } : { configured: false };
}

const clients = new Map<string, OpenAI>();

function clientFor(profile: LlmProfile): OpenAI {
  const key = `${profile.baseURL}|${profile.apiKey}`;
  let client = clients.get(key);
  if (!client) {
    client = new OpenAI({ apiKey: profile.apiKey, baseURL: profile.baseURL, maxRetries: 0 });
    clients.set(key, client);
  }
  return client;
}

function configuredTimeoutMs(): number {
  try {
    return getConfig().llmTimeoutMs;
  } catch {
    return DEFAULT_TIMEOUT_MS;
  }
}

/**
 * Pulls a JSON object out of a model reply that may include code fences, prose
 * (even prose with braces in it), <think> reasoning blocks, or trailing commas.
 * Tries each balanced {...} in order and returns the first that parses.
 */
export function extractJson(reply: string): unknown {
  // Only strip a fence wrapping the whole reply: string values may contain Markdown code fences.
  const unfenced = reply
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const direct = parseLenient(unfenced);
  if (direct !== undefined) return direct;
  for (const candidate of balancedObjects(unfenced)) {
    const parsed = parseLenient(candidate);
    if (parsed !== undefined && parsed !== null && typeof parsed === "object") return parsed;
  }
  return undefined;
}

const TRAILING_COMMA = /,(\s*[}\]])/g;

/** JSON.parse, then once more without trailing commas; undefined when neither parses. */
function parseLenient(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Only strip commas outside strings would be exact; replies with ",}" inside a string are rare enough.
    const repaired = text.replace(TRAILING_COMMA, "$1");
    if (repaired === text) return undefined;
    try {
      return JSON.parse(repaired);
    } catch {
      return undefined;
    }
  }
}

/** Every top-level balanced {...} span, in order (string-aware, so braces inside JSON strings don't count). */
function balancedObjects(text: string): string[] {
  const spans: string[] = [];
  let from = text.indexOf("{");
  while (from >= 0 && spans.length < 20) {
    const end = balancedEnd(text, from);
    if (end < 0) {
      from = text.indexOf("{", from + 1);
      continue;
    }
    spans.push(text.slice(from, end + 1));
    // A prose fragment such as "{hash map + list}" may hide the real object right after it,
    // and a failed parse of an outer span may still contain a valid inner object.
    from = text.indexOf("{", from + 1);
  }
  return spans;
}

function balancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}" && --depth === 0) {
      return i;
    }
  }
  return -1;
}

export interface CompleteJsonOptions {
  /** Total budget across every provider attempt. Defaults to SYNAPSE_LLM_TIMEOUT_MS (12 s). */
  timeoutMs?: number;
  temperature?: number;
  /** Includes hidden reasoning tokens on reasoning models, so keep it generous. Default 2500. */
  maxTokens?: number;
  /** Sent only to models that accept it (Meta Muse); ignored elsewhere. Default "low". */
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
}

const JSON_ONLY = "\n\nRespond with a single JSON object only: no markdown, no code fences, no commentary.";

/**
 * OpenAI's reasoning models (o1/o3/o4-mini…, gpt-5…) reject max_tokens (they
 * take max_completion_tokens) and any non-default temperature.
 */
export function isOpenAiReasoningModel(profile: Pick<LlmProfile, "provider" | "model">): boolean {
  return profile.provider === "openai" && /^(o\d|gpt-5)/i.test(profile.model);
}

/** Muse and OpenAI reasoning models take reasoning_effort; gpt-4o and Groq's Llama reject it. */
function acceptsReasoningEffort(profile: Pick<LlmProfile, "provider" | "model">): boolean {
  return (profile.provider === "meta" && /^muse/i.test(profile.model)) || isOpenAiReasoningModel(profile);
}

/** Sampling and length parameters in the shape the profile's model accepts. */
export function completionParams(
  profile: Pick<LlmProfile, "provider" | "model">,
  options: Pick<CompleteJsonOptions, "temperature" | "maxTokens" | "reasoningEffort">,
): Record<string, unknown> {
  const maxTokens = options.maxTokens ?? 2500;
  const reasoning = acceptsReasoningEffort(profile)
    ? { reasoning_effort: options.reasoningEffort ?? "low" }
    : {};
  if (isOpenAiReasoningModel(profile)) return { max_completion_tokens: maxTokens, ...reasoning };
  return { temperature: options.temperature ?? 0.3, max_tokens: maxTokens, ...reasoning };
}

/**
 * Asks the configured model chain for JSON matching `schema`. Returns null on
 * any failure (no key, timeout, HTTP error, invalid JSON) and never throws, so
 * callers always have a deterministic fallback path.
 */
export async function completeJson<T>(
  system: string,
  user: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  options: CompleteJsonOptions = {},
): Promise<T | null> {
  let profiles: LlmProfile[];
  try {
    profiles = activeProfiles();
  } catch {
    return null;
  }
  const deadline = Date.now() + (options.timeoutMs ?? configuredTimeoutMs());

  // One retry per provider for transient failures (dropped connection, 429, 5xx) when time allows.
  const attempts = profiles.flatMap((profile) => [profile, profile]);
  const failedOnce = new Set<LlmProfile>();
  for (const [index, profile] of attempts.entries()) {
    const isRetry = index % 2 === 1;
    if (isRetry && !failedOnce.has(profile)) continue;
    const remaining = deadline - Date.now();
    if (remaining < (isRetry ? 3_000 : 250)) {
      if (isRetry) continue;
      break;
    }
    try {
      const body: OpenAI.ChatCompletionCreateParamsNonStreaming = {
        model: profile.model,
        messages: [
          { role: "system", content: system + JSON_ONLY },
          { role: "user", content: user },
        ],
        ...(completionParams(profile, options) as Partial<OpenAI.ChatCompletionCreateParamsNonStreaming>),
      };
      const response = await clientFor(profile).chat.completions.create(body, { timeout: remaining, maxRetries: 0 });
      const choice = response.choices[0];
      const parsed = schema.safeParse(extractJson(choice?.message?.content ?? ""));
      if (parsed.success) return parsed.data;
      console.warn(
        `[synapse/llm] ${profile.provider}/${profile.model}: reply did not match the expected JSON shape (finish_reason=${choice?.finish_reason})`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[synapse/llm] ${profile.provider}/${profile.model} failed${isRetry ? " (retry)" : ""}: ${reason}`);
      if (!isRetry && isTransient(error)) failedOnce.add(profile);
    }
  }
  return null;
}

/** Worth one more try: the connection dropped, or the provider was rate limited or briefly down. Timeouts are not. */
function isTransient(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return false;
  if (error instanceof OpenAI.APIConnectionError) return true;
  if (error instanceof OpenAI.APIError) return error.status === 429 || (typeof error.status === "number" && error.status >= 500);
  return false;
}
