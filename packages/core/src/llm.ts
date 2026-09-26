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

function activeProfiles(): LlmProfile[] {
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

/** Pulls the first JSON object out of a model reply that may include code fences or prose. */
export function extractJson(reply: string): unknown {
  const unfenced = reply.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const candidate = firstBalancedObject(unfenced);
    if (!candidate) return undefined;
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }
}

function firstBalancedObject(text: string): string | undefined {
  const start = text.indexOf("{");
  if (start < 0) return undefined;
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
      return text.slice(start, i + 1);
    }
  }
  return undefined;
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

/** Muse is a reasoning model; gpt-4o and Groq's Llama reject the reasoning_effort parameter. */
function acceptsReasoningEffort(profile: LlmProfile): boolean {
  return profile.provider === "meta" && /^muse/i.test(profile.model);
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

  for (const profile of profiles) {
    const remaining = deadline - Date.now();
    if (remaining < 250) break;
    try {
      const response = await clientFor(profile).chat.completions.create(
        {
          model: profile.model,
          messages: [
            { role: "system", content: system + JSON_ONLY },
            { role: "user", content: user },
          ],
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2500,
          ...(acceptsReasoningEffort(profile)
            ? { reasoning_effort: (options.reasoningEffort ?? "low") as OpenAI.ReasoningEffort }
            : {}),
        },
        { timeout: remaining, maxRetries: 0 },
      );
      const choice = response.choices[0];
      const parsed = schema.safeParse(extractJson(choice?.message?.content ?? ""));
      if (parsed.success) return parsed.data;
      console.warn(
        `[synapse/llm] ${profile.provider}/${profile.model}: reply did not match the expected JSON shape (finish_reason=${choice?.finish_reason})`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[synapse/llm] ${profile.provider}/${profile.model} failed: ${reason}`);
    }
  }
  return null;
}
