import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getConfig } from "../env";
import { migrate } from "./schema";
import { SynapseStore } from "./store";
import type { StorePolicy } from "./types";

export { SynapseStore, isIdeStruggle } from "./store";
export { SCHEMA_VERSION } from "./schema";
export { LINK_CODE_PATTERN, normalizeHandle, parseLinkCode } from "./identity";
export { WEAK_HALF_LIFE_DAYS, WEAK_MAX_SCORE, WEAK_THRESHOLD, WEAKNESS_WEIGHTS, decayScore } from "./weakness";
export * from "./types";

function resolvePolicy(overrides: Partial<StorePolicy>): StorePolicy {
  const { timezone, dayMs, morningHour, newPerDay } = overrides;
  if (timezone !== undefined && dayMs !== undefined && morningHour !== undefined && newPerDay !== undefined) {
    return { timezone, dayMs, morningHour, newPerDay };
  }
  const config = getConfig();
  return {
    timezone: timezone ?? config.timezone,
    dayMs: dayMs ?? config.dayMs,
    morningHour: morningHour ?? config.morningHour,
    newPerDay: newPerDay ?? config.newPerDay,
  };
}

/**
 * Opens (creating and migrating if needed) the SQLite store. Defaults come from
 * the env config (SYNAPSE_DB_PATH, SYNAPSE_TIMEZONE, …); passing a full policy
 * and a path skips env loading entirely. WAL + busy_timeout let the web server
 * and the agent share one file.
 */
export function openStore(dbPath?: string, policy: Partial<StorePolicy> = {}): SynapseStore {
  const file = dbPath ?? getConfig().dbPath;
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  migrate(db);
  return new SynapseStore(db, resolvePolicy(policy));
}

const SHARED_STORE = Symbol.for("synapse.sharedStore");

/** Process-wide store on the default path, cached on globalThis so Next.js dev reloads reuse one connection. */
export function getSharedStore(): SynapseStore {
  const holder = globalThis as typeof globalThis & { [SHARED_STORE]?: SynapseStore };
  holder[SHARED_STORE] ??= openStore();
  return holder[SHARED_STORE];
}
