import type { SynapseStore } from "@synapse/core";

/**
 * Agent-only state that must survive a restart: snoozes, the last card for
 * "why" and ❓/‼️, the last inbound time (push cooldown), the last briefing,
 * the tapback-change memo, the iMessage line each chat is on, and notice
 * throttles. It lives in its own table in the shared SQLite file, created on
 * first use; core's migrations and the web app never read it. (Wrong link
 * codes are counted by core's link_failures table.)
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS agent_state (
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope, key)
  )
`;

/** The two better-sqlite3 statement methods used here (the generic prepare() type is too narrow to call with args). */
interface Statement {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
}

export class AgentState {
  private readonly read: Statement;
  private readonly write: Statement;
  private readonly remove: Statement;

  constructor(store: SynapseStore) {
    const { db } = store;
    db.exec(SCHEMA);
    this.read = db.prepare<unknown[]>("SELECT value FROM agent_state WHERE scope = ? AND key = ?");
    this.write = db.prepare<unknown[]>(
      `INSERT INTO agent_state (scope, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    );
    this.remove = db.prepare<unknown[]>("DELETE FROM agent_state WHERE scope = ? AND key = ?");
  }

  /** The stored JSON value, or undefined when missing or unreadable. */
  get<T>(scope: string, key: string): T | undefined {
    const row = this.read.get(scope, key) as { value: string } | undefined;
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return undefined;
    }
  }

  set(scope: string, key: string, value: unknown, now: number): void {
    this.write.run(scope, key, JSON.stringify(value), now);
  }

  delete(scope: string, key: string): void {
    this.remove.run(scope, key);
  }
}

export const userScope = (userId: string): string => `user:${userId}`;
export const spaceScope = (spaceId: string): string => `space:${spaceId}`;
