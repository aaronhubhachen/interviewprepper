import { getCard, type GradeInput, type GradeOutcome, type SynapseStore } from "@synapse/core";

/**
 * Changing a tapback (❤️ → 👎) must re-grade the card from its pre-review
 * state, not stack a second review on top (a 👍 after ❤️ would otherwise grow
 * the interval). Core has no undo, so the agent snapshots the rows a review
 * overwrites and restores them before grading again.
 *
 * TODO(core): this belongs in SynapseStore as `regradeReview(reviewId, grade, now)`.
 */

type Row = Record<string, unknown>;

/** The card's progress row and its tags' weak_tags rows as they were before a review. */
export interface ReviewSnapshot {
  progress: Row | null;
  weak: Row[];
}

export interface SnapshotGrade {
  outcome: GradeOutcome;
  snapshot: ReviewSnapshot;
}

/** Identifies the review being replaced. `reviewedAt` is the `now` it was graded with. */
export interface ReviewRef {
  userId: string;
  cardId: string;
  reviewId: number;
  reviewedAt: number;
  snapshot: ReviewSnapshot;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function takeSnapshot(store: SynapseStore, userId: string, cardId: string, tags: readonly string[]): ReviewSnapshot {
  const { db } = store;
  const progress = db.prepare("SELECT * FROM card_progress WHERE user_id = ? AND card_id = ?").get(userId, cardId) as
    | Row
    | undefined;
  const unique = [...new Set(tags)];
  const weak =
    unique.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM weak_tags WHERE user_id = ? AND tag IN (${unique.map(() => "?").join(", ")})`)
          .all(userId, ...unique) as Row[]);
  return { progress: progress ?? null, weak };
}

/** `store.gradeCard`, capturing what it overwrites in the same transaction. */
export function gradeWithSnapshot(store: SynapseStore, input: GradeInput): SnapshotGrade {
  const card = getCard(input.cardId);
  if (!card) throw new Error(`Unknown card: ${input.cardId}`);
  return store.db
    .transaction(() => {
      const snapshot = takeSnapshot(store, input.userId, card.id, card.tags);
      return { outcome: store.gradeCard(input), snapshot };
    })
    .immediate();
}

function restoreProgress(store: SynapseStore, ref: ReviewRef): void {
  const { db } = store;
  const prior = ref.snapshot.progress;
  if (!prior) {
    db.prepare("DELETE FROM card_progress WHERE user_id = ? AND card_id = ?").run(ref.userId, ref.cardId);
    return;
  }
  const columns = Object.keys(prior).filter((column) => column !== "user_id" && column !== "card_id" && IDENTIFIER.test(column));
  if (columns.length === 0) return;
  const assignments = columns.map((column) => `"${column}" = @${column}`).join(", ");
  const params: Row = { __user: ref.userId, __card: ref.cardId };
  for (const column of columns) params[column] = prior[column];
  db.prepare(`UPDATE card_progress SET ${assignments} WHERE user_id = @__user AND card_id = @__card`).run(params);
}

/**
 * Puts back weak-tag rows the review flagged (fail) or relieved (❤️), leaving
 * alone any tag something else re-flagged since (an IDE struggle, a ‼️).
 */
function restoreWeak(store: SynapseStore, ref: ReviewRef, tags: readonly string[]): void {
  const { db } = store;
  const current = db.prepare("SELECT score, last_flagged_at, source FROM weak_tags WHERE user_id = ? AND tag = ?");
  for (const tag of new Set(tags)) {
    const now = current.get(ref.userId, tag) as { last_flagged_at: number } | undefined;
    const prior = ref.snapshot.weak.find((row) => row.tag === tag);
    if (prior) {
      if (!now || (now.last_flagged_at !== prior.last_flagged_at && now.last_flagged_at !== ref.reviewedAt)) continue;
      db.prepare("UPDATE weak_tags SET score = ?, last_flagged_at = ?, source = ? WHERE user_id = ? AND tag = ?").run(
        prior.score as number,
        prior.last_flagged_at as number,
        prior.source as string,
        ref.userId,
        tag,
      );
    } else if (now && now.last_flagged_at === ref.reviewedAt) {
      db.prepare("DELETE FROM weak_tags WHERE user_id = ? AND tag = ?").run(ref.userId, tag);
    }
  }
}

/**
 * Replaces review `ref.reviewId` with `input.grade`: restores the pre-review
 * rows, deletes the review and its activity event, then grades again. Returns
 * null, changing nothing, when the card has been reviewed again since.
 */
export function regradeReview(store: SynapseStore, ref: ReviewRef, input: GradeInput): SnapshotGrade | null {
  const card = getCard(ref.cardId);
  if (!card || input.cardId !== ref.cardId || input.userId !== ref.userId) return null;
  const { db } = store;
  return db
    .transaction((): SnapshotGrade | null => {
      const latest = db.prepare("SELECT MAX(id) AS id FROM review_log WHERE user_id = ? AND card_id = ?").get(ref.userId, ref.cardId) as {
        id: number | null;
      };
      if (latest.id !== ref.reviewId) return null;
      db.prepare("DELETE FROM review_log WHERE id = ?").run(ref.reviewId);
      db.prepare(
        "DELETE FROM events WHERE user_id = ? AND kind = 'review' AND created_at = ? AND json_extract(detail, '$.cardId') = ?",
      ).run(ref.userId, ref.reviewedAt, ref.cardId);
      restoreProgress(store, ref);
      restoreWeak(store, ref, card.tags);
      const snapshot = takeSnapshot(store, ref.userId, card.id, card.tags);
      return { outcome: store.gradeCard(input), snapshot };
    })
    .immediate();
}
