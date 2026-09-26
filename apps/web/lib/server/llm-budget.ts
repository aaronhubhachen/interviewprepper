import "server-only";

import { tooManyRequests } from "./http";

/**
 * Process-wide budget for the paid model calls behind /api/review/evaluate,
 * /api/practice/evaluate and /api/spar/evaluate. Nothing else stops a script
 * or a stuck client from looping those routes on the owner's API key, so:
 *
 * - a token bucket caps the rate (a burst, then a steady per-minute refill), and
 * - a semaphore caps calls in flight (a spar grade can take 25 s).
 *
 * Over budget, callers pass useLlm: false and get core's deterministic
 * heuristic, the same fallback used when no key is configured, so a real user
 * still gets feedback. Spar sessions are also persisted, so saving them has
 * its own bucket and answers 429 past it (keeps data/synapse.db from growing
 * without bound).
 */

export class TokenBucket {
  private tokens: number;
  private updatedAt: number | null = null;

  constructor(
    readonly burst: number,
    readonly perMinute: number,
  ) {
    this.tokens = burst;
  }

  /** Takes one token if available. `now` is epoch ms; a clock that moves backwards refills nothing. */
  take(now: number): boolean {
    if (this.updatedAt !== null && now > this.updatedAt) {
      this.tokens = Math.min(this.burst, this.tokens + ((now - this.updatedAt) / 60_000) * this.perMinute);
    }
    this.updatedAt = this.updatedAt === null ? now : Math.max(this.updatedAt, now);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

export interface LlmBudgetOptions {
  burst: number;
  perMinute: number;
  maxInFlight: number;
}

export class LlmBudget {
  private inFlight = 0;
  private readonly bucket: TokenBucket;

  constructor(private readonly options: LlmBudgetOptions) {
    this.bucket = new TokenBucket(options.burst, options.perMinute);
  }

  /** A release callback when a model call may start now, else null (use the heuristic). */
  tryAcquire(now: number): (() => void) | null {
    if (this.inFlight >= this.options.maxInFlight) return null;
    if (!this.bucket.take(now)) return null;
    this.inFlight += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inFlight -= 1;
    };
  }

  get active(): number {
    return this.inFlight;
  }
}

/** A person grading cards or sparring stays far below these; a loop does not. */
const DEFAULT_LLM: LlmBudgetOptions = { burst: 20, perMinute: 20, maxInFlight: 4 };
const DEFAULT_SPAR_SAVES = { burst: 10, perMinute: 10 } as const;

const LLM_KEY = Symbol.for("synapse.web.llmBudget");
const SPAR_KEY = Symbol.for("synapse.web.sparSaveBudget");

type Holder = typeof globalThis & { [LLM_KEY]?: LlmBudget; [SPAR_KEY]?: TokenBucket };

const holder = globalThis as Holder;

function llmBudget(): LlmBudget {
  holder[LLM_KEY] ??= new LlmBudget(DEFAULT_LLM);
  return holder[LLM_KEY];
}

function sparSaveBudget(): TokenBucket {
  holder[SPAR_KEY] ??= new TokenBucket(DEFAULT_SPAR_SAVES.burst, DEFAULT_SPAR_SAVES.perMinute);
  return holder[SPAR_KEY];
}

/** Runs `evaluate(true)` inside the shared budget, or `evaluate(false)` (heuristic only) when it is spent. */
export async function withLlmBudget<T>(now: number, evaluate: (useLlm: boolean) => Promise<T>): Promise<T> {
  const release = llmBudget().tryAcquire(now);
  if (!release) return evaluate(false);
  try {
    return await evaluate(true);
  } finally {
    release();
  }
}

/** Throws a 429 once spar sessions are being saved faster than a person can speak them. */
export function takeSparSaveSlot(now: number): void {
  if (!sparSaveBudget().take(now)) {
    throw tooManyRequests("Too many sparring sessions in a short time. Wait a minute, then try again.");
  }
}

/** Test hooks: replace (or reset with undefined) the shared budgets. */
export function setLlmBudgetForTests(budget: LlmBudget | undefined): void {
  holder[LLM_KEY] = budget;
}

export function setSparSaveBudgetForTests(bucket: TokenBucket | undefined): void {
  holder[SPAR_KEY] = bucket;
}
