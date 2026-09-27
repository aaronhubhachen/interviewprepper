/**
 * Scripted Synapse demo without Photon: an in-memory store, a printing fake
 * iMessage chat and a virtual clock at demo scale (1 SRS day = 1 minute).
 *
 *   npm run agent:simulate                 (root)  or  npm run simulate -w @synapse/agent
 *   npm run simulate:offline -w @synapse/agent   force the heuristic grader (no network)
 *   tsx src/simulate.ts --heuristic --verbose      flags when running directly
 *
 * Grades with the LLM when a key is configured (unless --heuristic or
 * SYNAPSE_DISABLE_LLM=1); every scheduling step is deterministic either way.
 * The scheduler ticks every 5 s of virtual time (the README demo's
 * SYNAPSE_TICK_MS), so pushes land exactly when the live agent would send them.
 * Exits non-zero if a scripted check fails. (Not "--offline": npm swallows that
 * flag as its own config option.)
 */
import {
  drillCardsForProblem,
  evaluateAnswer,
  getCard,
  heuristicEvaluation,
  isLlmConfigured,
  listMicroCards,
  listProblems,
  llmStatus,
  loadEnv,
  openStore,
  clampSentences,
  tagLabel,
  zonedTimeToEpoch,
  type EvaluationInput,
  type Problem,
  type ReviewCard,
  type SynapseStore,
} from "@synapse/core";
import { StudyController, type ChatSpace, type Evaluator, type TickResult } from "./controller";
import { dispatchSpectrumMessage, type InboundMessage } from "./dispatch";

const TZ = "America/Chicago";
const DAY_MS = 60_000;
const SECOND = 1_000;
/** SYNAPSE_TICK_MS in the README's demo settings. */
const TICK_MS = 5 * SECOND;
const HOUR = 3_600_000;
const USER = "me";
const HANDLE = "+15555550123";

const args = new Set(process.argv.slice(2));
const offline = args.has("--heuristic");
const verbose = args.has("--verbose");

// ── Virtual clock & transcript printing ─────────────────────────────────────

class VirtualClock {
  constructor(private current: number) {}
  now = (): number => this.current;
  set(at: number): void {
    this.current = at;
  }
  advance(ms: number): number {
    this.current += ms;
    return this.current;
  }
}

const stampFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

const LABEL_WIDTH = 10;

function stamp(epoch: number): string {
  return `[${stampFormat.format(epoch).replace(/[  ]/g, " ")}]`.padEnd(14);
}

function bubble(clock: VirtualClock, who: string, text: string): void {
  const prefix = `${stamp(clock.now())} ${who.padEnd(LABEL_WIDTH)} │ `;
  const indent = `${" ".repeat(14)} ${" ".repeat(LABEL_WIDTH)} │ `;
  text.split("\n").forEach((line, index) => console.log(`${index === 0 ? prefix : indent}${line}`));
}

function narrate(text: string): void {
  console.log(`\n─── ${text}`);
}

function firstLine(text: string, max = 48): string {
  const line = text.split("\n")[0] ?? "";
  return line.length <= max ? line : `${line.slice(0, max - 1)}…`;
}

/** A fake iMessage chat that prints both sides of the conversation. */
class TranscriptSpace implements ChatSpace {
  readonly id = "sim:iMessage;-;+15555550123";
  readonly sent = new Map<string, string>();
  lastId: string | undefined;
  private seq = 0;

  constructor(private readonly clock: VirtualClock) {}

  async send(text: string): Promise<{ id: string }> {
    const id = `sim-msg-${++this.seq}`;
    this.sent.set(id, text);
    this.lastId = id;
    bubble(this.clock, "🤖 Synapse", text);
    return { id };
  }

  async responding<T>(work: () => Promise<T>): Promise<T> {
    console.log(`${" ".repeat(14)} ${" ".repeat(LABEL_WIDTH)} │ 💬 typing…`);
    return work();
  }
}

// ── Checks ──────────────────────────────────────────────────────────────────

const failures: string[] = [];

function check(condition: unknown, label: string): void {
  if (condition) return;
  failures.push(label);
  console.log(`   ✗ check failed: ${label}`);
}

// ── Content picks (robust to the content registry changing) ─────────────────

function pickLruCard(): ReviewCard {
  const match = listMicroCards().find((entry) => entry.id === "mc-lru-cache-o1") ??
    listMicroCards().find((entry) => /lru/i.test(entry.title)) ??
    listMicroCards()[0];
  const chosen = match ? getCard(match.id) : undefined;
  if (!chosen) throw new Error("The content registry has no micro-cards.");
  return chosen;
}

function pickBitmaskProblem(): Problem | undefined {
  const problems = listProblems();
  return (
    problems.find((problem) => problem.leetcodeSlug === "partition-to-k-equal-sum-subsets") ??
    problems.find((problem) => problem.weakTags.includes("dp_state_compression")) ??
    problems.find((problem) => drillCardsForProblem(problem).length > 0) ??
    problems[0]
  );
}

function pickSecondCard(lru: ReviewCard, problem: Problem | undefined): ReviewCard {
  const drillIds = new Set(problem ? drillCardsForProblem(problem).map((card) => card.id) : []);
  const unrelated = listMicroCards().find(
    (card) =>
      card.id !== lru.id &&
      !drillIds.has(card.id) &&
      !card.tags.some((tag) => problem?.weakTags.includes(tag) || lru.tags.includes(tag)),
  );
  const any = unrelated ?? listMicroCards().find((card) => card.id !== lru.id);
  const chosen = any ? getCard(any.id) : undefined;
  if (!chosen) throw new Error("The content registry needs at least two micro-cards.");
  return chosen;
}

/** A natural, short correct answer: the first sentence of the key when it already grades correct. */
function confidentAnswer(card: ReviewCard): string {
  const first = clampSentences(card.answerKey, 1, 400);
  const verdict = heuristicEvaluation({ question: card.prompt, answerKey: card.answerKey, keyPoints: card.keyPoints, answer: first });
  return verdict.verdict === "correct" ? first : card.answerKey;
}

function lruAnswer(card: ReviewCard): string {
  return card.id === "mc-lru-cache-o1"
    ? "Hash map from key to node plus a doubly linked list ordered by recency. Move a node to the front on every get/put and evict from the tail."
    : confidentAnswer(card);
}

function drillAnswer(card: ReviewCard): string {
  return card.id === "mc-bitmask-dp-transition"
    ? "For each city j not in mask, set its bit and go to dp[mask | (1 << j)][j]."
    : clampSentences(card.answerKey, 1, 400);
}

// ── The script ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();
  const useLlm = !offline && isLlmConfigured();
  const llm = llmStatus();
  const evaluate: Evaluator = useLlm
    ? (input: EvaluationInput) => evaluateAnswer(input, { timeoutMs: 15_000 })
    : async (input: EvaluationInput) => heuristicEvaluation(input);

  const start = zonedTimeToEpoch(TZ, 2026, 9, 28, 9, 0); // Monday 9:00 AM, Chicago
  const clock = new VirtualClock(start - 13 * HOUR);
  const store: SynapseStore = openStore(":memory:", { timezone: TZ, dayMs: DAY_MS, morningHour: 9, newPerDay: 8 });
  const space = new TranscriptSpace(clock);
  const controller = new StudyController<TranscriptSpace>({
    store,
    evaluate,
    now: clock.now,
    policy: { webUserId: USER, webUrl: process.env.SYNAPSE_WEB_URL?.trim() || "http://localhost:3000", platform: "simulator" },
    log: verbose ? (line) => console.log(`${" ".repeat(14)} ${"· log".padEnd(LABEL_WIDTH)} │ ${line}`) : () => undefined,
  });

  // Inbound messages go through the same dispatch as the live agent (index.ts), as Spectrum-shaped events.
  let inboundSeq = 0;
  const deliver = (content: InboundMessage["content"]) =>
    dispatchSpectrumMessage(
      controller,
      space,
      { id: `sim-in-${++inboundSeq}`, direction: "inbound", sender: { id: HANDLE }, content },
      { platform: "simulator" },
    ).done;
  // Virtual time only moves through wait(), which runs every scheduler tick on the way (like the live agent's timer).
  let nextTickAt = Number.POSITIVE_INFINITY;
  const startTicking = () => {
    nextTickAt = clock.now() + TICK_MS;
  };
  const wait = async (ms: number): Promise<TickResult[]> => {
    const target = clock.now() + ms;
    const sent: TickResult[] = [];
    while (nextTickAt <= target) {
      clock.set(nextTickAt);
      const mine = (await controller.tick(clock.now())).results.find((result) => result.userId === USER);
      if (mine?.action === "sent") sent.push(mine);
      if (verbose && mine && mine.reason !== "outstanding") console.log(`   (tick: ${mine.action}${mine.reason ? ` · ${mine.reason}` : ` · ${mine.cardId}`})`);
      nextTickAt += TICK_MS;
    }
    clock.set(target);
    return sent;
  };
  const you = async (text: string, afterMs = 12 * SECOND) => {
    await wait(afterMs);
    bubble(clock, "🙋 You", text);
    await deliver({ type: "text", text });
  };
  const tap = async (emoji: string, targetId: string | undefined, afterMs = 6 * SECOND) => {
    await wait(afterMs);
    const target = targetId ? space.sent.get(targetId) : undefined;
    bubble(clock, "🙋 You", `(tapped ${emoji} on "${firstLine(target ?? "?")}")`);
    await deliver({ type: "reaction", emoji, target: targetId ? { id: targetId } : null });
  };
  const pendingCard = () => store.getPending(USER)?.cardId;

  console.log("🧠 Synapse · iMessage agent simulation");
  console.log(
    `   Demo scale: 1 SRS day = ${DAY_MS / SECOND}s of virtual time, so "6h" ≈ 15s and "1d" = 1 min. ` +
      `Grader: ${useLlm ? `${llm.model} (${llm.provider})` : "heuristic (offline)"}.`,
  );

  const lru = pickLruCard();
  const problem = pickBitmaskProblem();
  const second = pickSecondCard(lru, problem);

  // Yesterday on the web app: two cards learned, a streak started.
  narrate("📜 Yesterday evening on the web app: you reviewed two cards");
  store.ensureUser(USER, clock.now() - HOUR);
  store.gradeCard({ userId: USER, cardId: lru.id, grade: 3, source: "web", now: clock.now() });
  store.gradeCard({ userId: USER, cardId: second.id, grade: 5, source: "web", now: clock.now() + 60 * SECOND });
  console.log(`   👍 ${lru.title}   ❤️ ${second.title}`);

  clock.advance(13 * HOUR);
  startTicking();
  const code = store.stats(USER, clock.now()).link.linkCode;
  check(code, "dashboard shows a link code");
  narrate(`🌐 Monday morning. The dashboard shows iMessage link code ${code}`);

  // 1. Link → morning briefing + first probe.
  await you(`link ${code}`, 5 * SECOND);
  check(store.getUser(USER)?.spaceId === space.id, "link binds this chat to the web user");
  check(pendingCard() === lru.id, `first probe is ${lru.title}`);
  const lruProbeId = space.lastId;

  // 2. Answer → Socratic feedback with the confidence legend.
  await you(lruAnswer(lru), 40 * SECOND);
  check(store.getPending(USER)?.phase === "awaiting_grade", "answer moves the probe to awaiting_grade");
  const lruFeedbackId = space.lastId;

  // 3. ❤️ on the feedback → SM-2 update.
  await tap("❤️", lruFeedbackId);
  const lruProgress = store.getProgress(USER, lru.id);
  check(lruProgress?.repetition === 2 && lruProgress.phase === "review", "❤️ graduates the card (repetition 2)");
  check(!store.getPending(USER), "grading clears the probe");
  check(lruProbeId !== lruFeedbackId, "question and feedback are separate messages");

  // 4. 'more' → next due card; ❓ for a hint; 'idk' → reveal + relearn.
  await you("more", 20 * SECOND);
  check(pendingCard() === second.id, `'more' serves the next due card (${second.title})`);
  await tap("❓", space.lastId);
  await you("idk", 25 * SECOND);
  const relearning = store.getProgress(USER, second.id);
  check(relearning?.phase === "relearning" && relearning.lapses === 1, "'idk' reveals and schedules a relearn (lapse)");

  // 5. The relearn step comes back ~15 s later (the relearn floor at demo scale), on a 5 s scheduler tick.
  narrate("⏳ The scheduler keeps ticking every 5 seconds");
  const retried = await wait(20 * SECOND);
  check(retried.some((result) => result.cardId === second.id), "the relearned card comes back ~15 s after 'idk'");
  check(pendingCard() === second.id, "the relearned card is the open probe");
  await you(confidentAnswer(second), 30 * SECOND);
  await tap("👍", space.lastId);
  check(store.getProgress(USER, second.id)?.phase === "review", "👍 after the relearn puts it back in review");

  // 6. Deep practice in the browser IDE: a struggle flags weak tags and queues drills.
  if (problem) {
    await wait(40 * SECOND);
    const attempt = store.recordIdeAttempt({
      userId: USER,
      problemId: problem.id,
      stage: "edgeCase",
      passed: false,
      hintsUsed: 2,
      attemptNumber: 2,
      now: clock.now(),
    });
    narrate(`💻 Web IDE: you stumble on Stage 2 (edge-case trap) of ${problem.title} after 2 hints`);
    console.log(`   ⚠️ Weak spots flagged: ${attempt.flaggedTags.map(tagLabel).join(", ") || "none"}`);
    console.log(
      `   🎯 Drill queued for iMessage ${attempt.drillLabel ?? "(no related micro-cards)"}: ${attempt.drills.map((drill) => drill.title).join(" + ") || "none"}`,
    );
    check(attempt.struggled, "the IDE attempt counts as a struggle");

    // 7. "Next morning" (one SRS day later at demo scale): briefing + the drill.
    narrate("🌅 One SRS day later (1 virtual minute): the next-morning drill arrives");
    const pushed = await wait(DAY_MS + TICK_MS); // the first tick at or after the drill time
    const drillIds = attempt.drills.map((entry) => entry.cardId);
    const drill = pushed.find((result) => drillIds.includes(result.cardId ?? ""));
    if (drillIds.length > 0) {
      check(drill?.morning === true, "the drill arrives with a Morning Synapse briefing");
      check(drill !== undefined && pendingCard() === drill.cardId, "the open probe is the queued drill card");
      const drillCard = getCard(drill?.cardId ?? "");
      if (drillCard) {
        await you(drillAnswer(drillCard), 45 * SECOND);
        await tap("👍", space.lastId);
      }
    }
  }

  // 8. Progress check.
  await you("stats", 15 * SECOND);
  await controller.idle();

  const final = store.stats(USER, clock.now());
  narrate("📊 Final state");
  console.log(`   Reviews today: ${final.reviewedToday} · streak ${final.streakDays} days · cards learned ${final.cardsLearned}`);
  console.log(`   Weak spots: ${final.weakTags.map((weak) => `${weak.label} (${weak.score})`).join(", ") || "none"}`);
  store.close();

  if (failures.length > 0) {
    console.log(`\n✗ ${failures.length} check(s) failed:\n  - ${failures.join("\n  - ")}`);
    process.exit(1);
  }
  console.log("\n✓ Simulation complete: every scripted check passed.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("[synapse-simulate] failed", error);
  process.exit(1);
});
