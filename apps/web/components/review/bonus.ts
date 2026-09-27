/**
 * "Study new cards" after the queue is empty: pick the next never-seen card,
 * ignoring the daily new-card cap (like Anki's custom study). Pure and
 * browser-safe; the /api/review/bonus route feeds it the store state.
 */
import type { CardKind, Tag } from "@synapse/core/content";

export interface BonusCandidate {
  id: string;
  kind: CardKind;
  tags: readonly Tag[];
  difficulty: number;
}

export interface BonusOptions {
  /** Card ids the user has already seen (any progress row). */
  seen: ReadonlySet<string>;
  /** Skipped this session. */
  exclude?: ReadonlySet<string>;
  /** Only cards with this tag. */
  tag?: Tag;
  /** Current weak-tag scores (higher = weaker). */
  weakScores?: ReadonlyMap<string, number>;
}

/**
 * Unseen cards in scope, ordered: weakest tags first, micro-cards before
 * problems, easier first, then registry order (stable).
 */
export function rankBonusCards<T extends BonusCandidate>(cards: readonly T[], options: BonusOptions): T[] {
  const weak = options.weakScores ?? new Map<string, number>();
  const weakness = (card: T) => card.tags.reduce((sum, tag) => sum + (weak.get(tag) ?? 0), 0);
  return cards
    .map((card, index) => ({ card, index, weakness: weakness(card) }))
    .filter(
      ({ card }) =>
        !options.seen.has(card.id) && !options.exclude?.has(card.id) && (!options.tag || card.tags.includes(options.tag)),
    )
    .sort(
      (a, b) =>
        b.weakness - a.weakness ||
        Number(a.card.kind === "problem") - Number(b.card.kind === "problem") ||
        a.card.difficulty - b.card.difficulty ||
        a.index - b.index,
    )
    .map(({ card }) => card);
}

export function pickBonusCard<T extends BonusCandidate>(cards: readonly T[], options: BonusOptions): T | undefined {
  return rankBonusCards(cards, options)[0];
}
