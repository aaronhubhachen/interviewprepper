import type Database from "better-sqlite3";

/** Ordered migrations; index + 1 is the resulting PRAGMA user_version. Append only. */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    handle TEXT,
    space_id TEXT,
    platform TEXT,
    link_code TEXT,
    paused INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS users_space_id ON users(space_id) WHERE space_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS users_link_code ON users(link_code) WHERE link_code IS NOT NULL;
  CREATE INDEX IF NOT EXISTS users_handle ON users(handle);

  CREATE TABLE IF NOT EXISTS card_progress (
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    card_kind TEXT NOT NULL,
    repetition INTEGER NOT NULL,
    interval_days REAL NOT NULL,
    ease_factor REAL NOT NULL,
    due_at INTEGER NOT NULL,
    lapses INTEGER NOT NULL,
    phase TEXT NOT NULL,
    last_reviewed_at INTEGER,
    boost_reason TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, card_id)
  );
  CREATE INDEX IF NOT EXISTS card_progress_due ON card_progress(user_id, due_at);

  CREATE TABLE IF NOT EXISTS review_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    card_kind TEXT NOT NULL,
    grade INTEGER NOT NULL,
    source TEXT NOT NULL,
    answer TEXT,
    verdict TEXT,
    phase_before TEXT NOT NULL,
    interval_before REAL NOT NULL,
    interval_after REAL NOT NULL,
    ease_after REAL NOT NULL,
    reviewed_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS review_log_user_time ON review_log(user_id, reviewed_at);

  CREATE TABLE IF NOT EXISTS pending (
    user_id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    question_message_id TEXT,
    feedback_message_id TEXT,
    answer TEXT,
    verdict TEXT,
    asked_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weak_tags (
    user_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    score REAL NOT NULL,
    last_flagged_at INTEGER NOT NULL,
    source TEXT NOT NULL,
    PRIMARY KEY (user_id, tag)
  );

  CREATE TABLE IF NOT EXISTS push_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    card_id TEXT,
    local_day TEXT NOT NULL,
    sent_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS push_log_user_day ON push_log(user_id, local_day);

  CREATE TABLE IF NOT EXISTS ide_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    problem_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    language TEXT,
    passed INTEGER NOT NULL,
    tests_passed INTEGER,
    tests_total INTEGER,
    hints_used INTEGER NOT NULL DEFAULT 0,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    gave_up INTEGER NOT NULL DEFAULT 0,
    struggled INTEGER NOT NULL,
    duration_ms INTEGER,
    code TEXT,
    answer TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ide_attempts_user_problem ON ide_attempts(user_id, problem_id, created_at);

  CREATE TABLE IF NOT EXISTS spar_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    transcript TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    overall INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS spar_sessions_user_time ON spar_sessions(user_id, created_at);

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_user_time ON events(user_id, created_at);
  `,
  // 2: failed "link <code>" attempts, for per-sender lockout and code rotation.
  `
  CREATE TABLE IF NOT EXISTS link_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id TEXT NOT NULL,
    handle TEXT,
    failed_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS link_failures_space ON link_failures(space_id, failed_at);
  CREATE INDEX IF NOT EXISTS link_failures_handle ON link_failures(handle, failed_at);
  CREATE INDEX IF NOT EXISTS link_failures_time ON link_failures(failed_at);
  `,
  // 3: when the current link code was issued, so codes expire (LINK_CODE_TTL_MS); older rows get NULL and a new code.
  //    review_undo: the rows a review overwrote (the card's progress, its tags' weak_tags), so regradeReview can
  //    replace the latest review of a card. One row per user and card: only the latest review can be replaced.
  `
  ALTER TABLE users ADD COLUMN link_code_issued_at INTEGER;

  CREATE TABLE IF NOT EXISTS review_undo (
    review_id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    progress TEXT,
    weak TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS review_undo_card ON review_undo(user_id, card_id);
  `,
  // 4: scored interview rounds beyond sparring (resume grill, AI-assisted coding, mock loop, system design).
  //    Only the report is kept (no resume text or code), so the dashboard can show trends.
  `
  CREATE TABLE IF NOT EXISTS practice_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    subject TEXT,
    score INTEGER NOT NULL,
    report TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS practice_sessions_user_kind ON practice_sessions(user_id, kind, created_at);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/**
 * Brings the database to SCHEMA_VERSION. Runs under BEGIN IMMEDIATE so the web
 * server and the agent can open a fresh file concurrently without racing.
 */
export function migrate(db: Database.Database): void {
  const apply = db.transaction(() => {
    const current = db.pragma("user_version", { simple: true }) as number;
    for (let version = current; version < MIGRATIONS.length; version++) {
      db.exec(MIGRATIONS[version]!);
      db.pragma(`user_version = ${version + 1}`);
    }
  });
  apply.immediate();
}
