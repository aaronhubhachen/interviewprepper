import "server-only";

import { getConfig, getSharedStore, loadEnv, type SynapseConfig, type SynapseStore } from "@synapse/core";

/**
 * Server-side access to the shared SQLite store. The store is cached on
 * globalThis (inside core's getSharedStore and here) so Next dev HMR reloads
 * reuse a single connection. Tests inject an in-memory store and a fixed clock.
 */
const STORE_KEY = Symbol.for("synapse.web.store");
const CLOCK_KEY = Symbol.for("synapse.web.clock");
const USER_KEY = Symbol.for("synapse.web.userId");

type Holder = typeof globalThis & {
  [STORE_KEY]?: SynapseStore;
  [CLOCK_KEY]?: () => number;
  [USER_KEY]?: string;
};

const holder = globalThis as Holder;

/** Loads the repo-root .env (idempotent) and returns the validated config. */
export function config(): SynapseConfig {
  loadEnv();
  return getConfig();
}

export function getStore(): SynapseStore {
  if (!holder[STORE_KEY]) {
    loadEnv();
    holder[STORE_KEY] = getSharedStore();
  }
  return holder[STORE_KEY];
}

/** The single web user (SYNAPSE_WEB_USER_ID, default "me"). */
export function currentUserId(): string {
  return holder[USER_KEY] ?? config().webUserId;
}

/** Wall clock for request handling (injectable for tests). */
export function now(): number {
  return holder[CLOCK_KEY]?.() ?? Date.now();
}

/** Test hooks: override (or reset with undefined) the store, clock, and user. */
export function setStoreForTests(store: SynapseStore | undefined): void {
  holder[STORE_KEY] = store;
}

export function setClockForTests(clock: (() => number) | undefined): void {
  holder[CLOCK_KEY] = clock;
}

export function setUserForTests(userId: string | undefined): void {
  holder[USER_KEY] = userId;
}
