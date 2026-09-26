import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { DEFAULT_DAY_MS, isDemoScale, schedulerOptions, type SchedulerOptions } from "./sm2";
import { isValidTimeZone, parseActiveHours, type ActiveHours } from "./time";

/** Nearest ancestor of `start` whose package.json declares "workspaces" (falls back to `start`). */
export function findRepoRoot(start: string = process.cwd()): string {
  const origin = path.resolve(start);
  for (let dir = origin; ; dir = path.dirname(dir)) {
    if (declaresWorkspaces(path.join(dir, "package.json"))) return dir;
    if (path.dirname(dir) === dir) return origin;
  }
}

function declaresWorkspaces(manifestPath: string): boolean {
  try {
    return Boolean(JSON.parse(fs.readFileSync(manifestPath, "utf8")).workspaces);
  } catch {
    return false;
  }
}

let loadedRoot: string | undefined;

/** Loads <repo root>/.env without overriding variables already set. Idempotent; returns the repo root. */
export function loadEnv(): string {
  if (!loadedRoot) {
    loadedRoot = findRepoRoot();
    dotenv.config({ path: path.join(loadedRoot, ".env"), override: false, quiet: true });
  }
  return loadedRoot;
}

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalText = z.preprocess(blankToUndefined, z.string().optional());

const text = (fallback: string) => z.preprocess(blankToUndefined, z.string().default(fallback));

const integer = (fallback: number, min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().min(min).max(max).default(fallback));

const flag = z.preprocess(
  blankToUndefined,
  z
    .enum(["1", "0", "true", "false", "yes", "no", "on", "off"])
    .optional()
    .transform((value) => value === "1" || value === "true" || value === "yes" || value === "on"),
);

const envSchema = z.object({
  SYNAPSE_DB_PATH: optionalText,
  SYNAPSE_WEB_USER_ID: text("me"),
  SYNAPSE_WEB_URL: z.preprocess(blankToUndefined, z.string().url().default("http://localhost:3000")),
  SYNAPSE_DAY_MS: integer(DEFAULT_DAY_MS, 1_000, 7 * DEFAULT_DAY_MS),
  SYNAPSE_TIMEZONE: text("America/Chicago").refine(isValidTimeZone, "must be an IANA time zone"),
  SYNAPSE_ACTIVE_HOURS: text("8-22").transform((spec, ctx) => {
    try {
      return parseActiveHours(spec);
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
      return z.NEVER;
    }
  }),
  SYNAPSE_MORNING_HOUR: integer(9, 0, 23),
  SYNAPSE_MAX_DAILY_PUSHES: integer(12, 0, 10_000),
  SYNAPSE_NEW_PER_DAY: integer(8, 0, 10_000),
  SYNAPSE_TICK_MS: integer(30_000, 1_000, 3_600_000),
  SYNAPSE_OWNER_HANDLE: optionalText,
  SYNAPSE_LLM_TIMEOUT_MS: integer(12_000, 1_000, 120_000),
  SYNAPSE_DISABLE_LLM: flag,
  PHOTON_PROJECT_ID: optionalText,
  PHOTON_PROJECT_SECRET: optionalText,
});

export interface SynapseConfig {
  repoRoot: string;
  dbPath: string;
  webUserId: string;
  webUrl: string;
  timezone: string;
  dayMs: number;
  scheduler: SchedulerOptions;
  /** SYNAPSE_DAY_MS < 1 hour: active-hours limits are ignored. */
  demoScale: boolean;
  activeHours: ActiveHours;
  morningHour: number;
  maxDailyPushes: number;
  newPerDay: number;
  tickMs: number;
  /** Outstanding probes older than this (dayMs / 4, ~6 SRS hours) expire ungraded. */
  probeTtlMs: number;
  /** Phone/email the agent may DM proactively before anyone has texted it. */
  ownerHandle?: string;
  llmTimeoutMs: number;
  llmDisabled: boolean;
  photon: { projectId?: string; projectSecret?: string };
}

/** Pure: validates an env map. Throws a readable error listing every invalid variable. */
export function parseConfig(env: Record<string, string | undefined>, repoRoot: string): SynapseConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid Synapse environment:\n${issues.join("\n")}`);
  }
  const e = parsed.data;
  const dbPath = e.SYNAPSE_DB_PATH
    ? path.resolve(repoRoot, e.SYNAPSE_DB_PATH)
    : path.join(repoRoot, "data", "synapse.db");
  return {
    repoRoot,
    dbPath,
    webUserId: e.SYNAPSE_WEB_USER_ID,
    webUrl: e.SYNAPSE_WEB_URL.replace(/\/+$/, ""),
    timezone: e.SYNAPSE_TIMEZONE,
    dayMs: e.SYNAPSE_DAY_MS,
    scheduler: schedulerOptions(e.SYNAPSE_DAY_MS),
    demoScale: isDemoScale(e.SYNAPSE_DAY_MS),
    activeHours: e.SYNAPSE_ACTIVE_HOURS,
    morningHour: e.SYNAPSE_MORNING_HOUR,
    maxDailyPushes: e.SYNAPSE_MAX_DAILY_PUSHES,
    newPerDay: e.SYNAPSE_NEW_PER_DAY,
    tickMs: e.SYNAPSE_TICK_MS,
    probeTtlMs: Math.round(e.SYNAPSE_DAY_MS / 4),
    ownerHandle: e.SYNAPSE_OWNER_HANDLE,
    llmTimeoutMs: e.SYNAPSE_LLM_TIMEOUT_MS,
    llmDisabled: e.SYNAPSE_DISABLE_LLM,
    photon: { projectId: e.PHOTON_PROJECT_ID, projectSecret: e.PHOTON_PROJECT_SECRET },
  };
}

let cachedConfig: SynapseConfig | undefined;

/** Loads the root .env once and returns the validated config (cached per process). */
export function getConfig(): SynapseConfig {
  if (!cachedConfig) {
    const root = loadEnv();
    cachedConfig = parseConfig(process.env, root);
  }
  return cachedConfig;
}
