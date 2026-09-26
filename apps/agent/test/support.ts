import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  drillCardsForProblem,
  getCard,
  heuristicEvaluation,
  listProblems,
  openStore,
  zonedTimeToEpoch,
  type PendingProbe,
  type Problem,
  type ReviewCard,
  type SynapseStore,
} from "@synapse/core";
import { StudyController, type AgentPolicy, type ChatSpace, type Evaluator } from "../src/controller";

export const CHI = "America/Chicago";
export const SECOND = 1_000;
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
export const WEB_USER = "me";

/** Local wall-clock time in Chicago. Sep 28 2026 is a Monday. */
export function chicago(month: number, day: number, hour: number, minute = 0): number {
  return zonedTimeToEpoch(CHI, 2026, month, day, hour, minute);
}

export interface SentMessage {
  id: string;
  text: string;
}

/** Records every send; ids are unique per space so tapback targets can be checked. */
export class FakeSpace implements ChatSpace {
  readonly sent: SentMessage[] = [];
  typing = 0;
  private seq = 0;

  constructor(readonly id = "iMessage;-;+13145550101") {}

  async send(text: string): Promise<{ id: string }> {
    const id = `${this.id}#${++this.seq}`;
    this.sent.push({ id, text });
    return { id };
  }

  async responding<T>(work: () => Promise<T>): Promise<T> {
    this.typing += 1;
    return work();
  }

  get last(): SentMessage {
    const message = this.sent.at(-1);
    if (!message) throw new Error("nothing was sent");
    return message;
  }

  get texts(): string[] {
    return this.sent.map((message) => message.text);
  }

  /** Messages that are flashcard probes (they end with the reply footer). */
  get probes(): SentMessage[] {
    return this.sent.filter((message) => isProbe(message.text));
  }
}

export function isProbe(text: string): boolean {
  return /'idk' to reveal\)$/.test(text) && /^(🧠 Synapse|☕ Morning Synapse) · /.test(text);
}

export interface Clock {
  now: () => number;
  set: (at: number) => void;
  advance: (ms: number) => number;
}

export interface HarnessOptions {
  start: number;
  dayMs?: number;
  newPerDay?: number;
  morningHour?: number;
  policy?: Partial<AgentPolicy>;
  evaluate?: Evaluator;
}

export interface Harness {
  store: SynapseStore;
  /** The temp SQLite file behind `store` (open a second connection to inspect rows). */
  dbPath: string;
  controller: StudyController<FakeSpace>;
  space: FakeSpace;
  clock: Clock;
  cleanup: () => void;
}

const heuristic: Evaluator = async (input) => heuristicEvaluation(input);

/** Temp-file store + controller with a fake clock and the deterministic heuristic grader. */
export function createHarness(options: HarnessOptions): Harness {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synapse-agent-"));
  const dbPath = path.join(dir, "synapse.db");
  const store = openStore(dbPath, {
    timezone: CHI,
    dayMs: options.dayMs ?? DAY,
    morningHour: options.morningHour ?? 9,
    newPerDay: options.newPerDay ?? 8,
  });
  let current = options.start;
  const clock: Clock = {
    now: () => current,
    set: (at) => {
      current = at;
    },
    advance: (ms) => (current += ms),
  };
  store.ensureUser(WEB_USER, options.start - DAY);
  const controller = new StudyController<FakeSpace>({
    store,
    now: clock.now,
    evaluate: options.evaluate ?? heuristic,
    policy: { pushGapMs: 0, webUserId: WEB_USER, webUrl: "http://synapse.test", ...options.policy },
    log: () => undefined,
  });
  return {
    store,
    dbPath,
    controller,
    space: new FakeSpace(),
    clock,
    cleanup: () => {
      store.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Texts "link <code>" like a real user (the agent replies and sends the first card). */
export async function linkByText(h: Harness): Promise<void> {
  const code = h.store.createOrGetLinkCode(WEB_USER);
  await h.controller.handleText(h.space, `link ${code}`, { handle: "(314) 555-0101" });
}

/** Binds the fake space to the web user without any conversation (for scheduler tests). */
export function linkQuietly(h: Harness): void {
  const code = h.store.createOrGetLinkCode(WEB_USER);
  h.store.linkByCode(code, { spaceId: h.space.id, handle: "+13145550101", platform: "imessage" }, h.clock.now());
  h.controller.rememberSpace(h.space);
}

export function pending(h: Harness): PendingProbe {
  const probe = h.store.getPending(WEB_USER);
  if (!probe) throw new Error("no pending probe");
  return probe;
}

export function pendingCard(h: Harness): ReviewCard {
  const card = getCard(pending(h).cardId);
  if (!card) throw new Error("pending card is not in the registry");
  return card;
}

/** Answers the open probe with its own answer key (content tests guarantee it grades "correct"). */
export async function answerCorrectly(h: Harness, afterMs = 30 * SECOND): Promise<ReviewCard> {
  const card = pendingCard(h);
  h.clock.advance(afterMs);
  await h.controller.handleText(h.space, card.answerKey);
  return card;
}

/** Answers, then taps ❤️ on the feedback: leaves nothing pending. */
export async function completeProbe(h: Harness, emoji = "❤️"): Promise<ReviewCard> {
  const card = await answerCorrectly(h);
  h.clock.advance(5 * SECOND);
  await h.controller.handleReaction(h.space, emoji, pending(h).feedbackMessageId);
  return card;
}

/** A problem whose IDE struggle queues at least one micro-card drill. */
export function problemWithDrills(): Problem {
  const problem = listProblems().find((entry) => entry.weakTags.length > 0 && drillCardsForProblem(entry).length > 0);
  if (!problem) throw new Error("content needs a problem with related micro-cards");
  return problem;
}
