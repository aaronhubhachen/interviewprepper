"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { tagLabel, type Tag } from "@synapse/core/content";
import type { Rating } from "@synapse/core/sm2";
import type { TextGrade } from "@synapse/core/tapback";
import { SynapseGlyph } from "@/components/shell/SynapseGlyph";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChatBubble, ChatThread } from "@/components/ui/ChatBubble";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { Spinner } from "@/components/ui/Spinner";
import { TapbackButtons } from "@/components/ui/TapbackButtons";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, evaluateCardAnswer, fetchNextCard, gradeCard } from "@/lib/api";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { fetchBonusCard, isAbort } from "@/components/dashboard/api";
import { usePrefersReducedMotion } from "@/components/dashboard/hooks";
import { Composer, MAX_ANSWER_CHARS } from "./Composer";
import { SessionSidebar } from "./SessionSidebar";
import { currentTurn, initialSession, reviewedCount, sessionReducer, type SessionAction, type SessionState } from "./session";
import { TurnView } from "./TurnView";

/** Pause on the "returns in 6d" confirmation before the next card slides in. */
const ADVANCE_MS = 1100;
/** Minimum "typing…" time so a fast fetch still reads as a reply, not a flash. */
const TYPING_MS = 450;
const IDK_ANSWER = "I don't know";

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export interface ReviewSessionProps {
  /** Only cards with this tag (/review?tag=…). */
  tag?: Tag;
  /** A ?tag= value that is not a known pattern (shown as a warning; ignored). */
  invalidTag?: string;
  /** Seed state for tests and previews; skips the initial fetch. */
  initialState?: SessionState;
}

export function ReviewSession({ tag, invalidTag, initialState }: ReviewSessionProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialState, (seed) => seed ?? initialSession());
  const seeded = useRef(Boolean(initialState));
  const [draft, setDraft] = useState("");
  const { toast } = useToast();
  const reducedMotion = usePrefersReducedMotion();

  // The reducer is pure, so mirroring it into a ref gives event handlers the
  // latest state synchronously (guards double key presses and stale closures).
  const stateRef = useRef<SessionState>(state);
  const act = useCallback((action: SessionAction) => {
    stateRef.current = sessionReducer(stateRef.current, action);
    dispatch(action);
  }, []);

  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const loadController = useRef<AbortController | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);

  const loadNext = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    act({ type: "load" });
    const { mode, skipped } = stateRef.current;
    const query = { tag, exclude: skipped };
    try {
      const [response] = await Promise.all([
        mode === "bonus"
          ? fetchBonusCard(query, { signal: controller.signal })
          : fetchNextCard(query, { signal: controller.signal }),
        reducedMotionRef.current ? Promise.resolve() : sleep(TYPING_MS),
      ]);
      if (controller.signal.aborted) return;
      if (response.card !== null) act({ type: "card", next: response });
      else act({ type: "empty", empty: response });
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      act({ type: "error", scope: "next", message: errorMessage(error) });
    }
  }, [act, tag]);

  useEffect(() => {
    if (!seeded.current) void loadNext();
    return () => {
      loadController.current?.abort();
      requestController.current?.abort();
    };
  }, [loadNext]);

  // Auto-advance after the confirmation bubble.
  useEffect(() => {
    if (state.phase !== "graded") return;
    const timer = window.setTimeout(() => void loadNext(), ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, loadNext]);

  const submit = useCallback(
    async (raw: string, gaveUp: boolean) => {
      const turn = currentTurn(stateRef.current);
      const answer = raw.trim().slice(0, MAX_ANSWER_CHARS);
      if (!turn || stateRef.current.phase !== "answering" || !answer) return;
      interacted.current = true;
      act({ type: "submit", answer, gaveUp });
      setDraft("");
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const evaluation = await evaluateCardAnswer({ cardId: turn.next.card.id, answer }, { signal: controller.signal });
        act({ type: "evaluated", evaluation });
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) return;
        act({ type: "error", scope: "evaluate", message: errorMessage(error) });
        if (!gaveUp) setDraft(answer);
        toast({ tone: "danger", title: "Couldn't grade that answer", description: errorMessage(error) });
      }
    },
    [act, toast],
  );

  const rate = useCallback(
    async (grade: TextGrade, rating: Rating) => {
      const turn = currentTurn(stateRef.current);
      if (!turn || stateRef.current.phase !== "rating" || !turn.evaluation) return;
      act({ type: "rate", rating });
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const result = await gradeCard(
          { cardId: turn.next.card.id, grade, answer: turn.answer ?? undefined, verdict: turn.evaluation.evaluation },
          { signal: controller.signal },
        );
        act({ type: "graded", result, at: Date.now() });
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) return;
        act({ type: "error", scope: "grade", message: errorMessage(error) });
        toast({
          tone: "danger",
          title: "Couldn't save your rating",
          description: `${errorMessage(error)} Try the tapback again.`,
        });
      }
    },
    [act, toast],
  );

  const skip = useCallback(() => {
    if (!currentTurn(stateRef.current) || stateRef.current.phase !== "answering") return;
    interacted.current = true;
    setDraft("");
    act({ type: "skip" });
    void loadNext();
  }, [act, loadNext]);

  const studyNew = useCallback(() => {
    interacted.current = true;
    act({ type: "bonus" });
    void loadNext();
  }, [act, loadNext]);

  const turn = currentTurn(state);

  // Keep the newest message in view: scroll so the latest anchor starts at the
  // top when it is long, or everything below it fits.
  const scrollKey = `${state.turns.length}:${state.phase}:${turn?.hintShown ?? ""}`;
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const anchors = thread.querySelectorAll<HTMLElement>("[data-anchor]");
    const anchor = anchors[anchors.length - 1];
    const max = thread.scrollHeight - thread.clientHeight;
    let top = max;
    if (anchor) {
      const offset = anchor.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop;
      top = Math.min(max, Math.max(0, offset - 12));
    }
    thread.scrollTo({ top, behavior: reducedMotionRef.current ? "auto" : "smooth" });
  }, [scrollKey]);

  // Focus follows the loop: composer → tapbacks → next composer (or the CTA when done).
  useEffect(() => {
    if (state.phase === "answering") {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      if (interacted.current || !coarse) textareaRef.current?.focus({ preventScroll: true });
    } else if (state.phase === "rating") {
      ratingRef.current?.focus({ preventScroll: true });
    } else if (state.phase === "done" && interacted.current) {
      doneRef.current?.querySelector<HTMLElement>("button, a")?.focus({ preventScroll: true });
    }
  }, [state.phase, state.seq]);

  const label = tag ? tagLabel(tag) : null;
  const reviewed = reviewedCount(state);
  const subtitle =
    state.mode === "bonus"
      ? "Bonus practice: new cards past today's cap"
      : label
        ? `Drilling ${label}`
        : "Same loop as iMessage: answer, feedback, tapback";

  return (
    <>
      <PageHeader
        eyebrow={label ? "Pattern drill" : "Flashcards"}
        title={label ? `Drill: ${label}` : "Review"}
        description={
          label
            ? `Cards tagged ${label}, due ones first. Nothing due? You get bonus practice ahead of schedule.`
            : "Answer in your own words, get Socratic feedback, then rate your recall with a tapback. SM-2 does the rest."
        }
        actions={
          label ? (
            <ButtonLink href="/review" variant="secondary">
              All due cards
            </ButtonLink>
          ) : null
        }
      />

      {invalidTag ? (
        <Banner tone="warning" title="Unknown pattern" className="mb-4">
          “{invalidTag.slice(0, 60)}” isn&apos;t a Prepr pattern, so you&apos;re reviewing all due cards.
        </Banner>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Card padded={false} className="flex h-[clamp(28rem,calc(100dvh_-_12rem),52rem)] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
            <SynapseGlyph className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Prepr</p>
              <p className="truncate text-xs text-fg-subtle">{subtitle}</p>
            </div>
            {state.queue ? (
              <Pill tone={state.queue.dueNow > 0 ? "cyan" : "neutral"} title="Cards due now · new cards left today">
                {state.queue.dueNow} due · {state.queue.newRemaining} new
              </Pill>
            ) : null}
          </div>

          <ChatThread ref={threadRef} label="Review conversation" className="flex-1 px-4 pb-6 sm:px-6">
            {state.turns.map((entry, index) => (
              <TurnView key={entry.key} turn={entry} phase={state.phase} isCurrent={index === state.turns.length - 1} />
            ))}

            {state.phase === "loading" ? (
              <div data-anchor className={cn(state.turns.length === 0 && "pt-3")}>
                <ChatBubble from="agent" name={state.turns.length === 0 ? "Prepr" : undefined} typing />
              </div>
            ) : null}

            {state.phase === "error" && state.error ? (
              <div data-anchor className={cn("pt-3", state.turns.length === 0 && "my-auto")}>
                <Banner
                  tone="danger"
                  title="Couldn't load the next card"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => void loadNext()}>
                      Retry
                    </Button>
                  }
                >
                  {state.error.message}
                </Banner>
              </div>
            ) : null}

            {state.phase === "done" ? (
              <div data-anchor className={cn("pt-3", state.turns.length === 0 && "my-auto")}>
                <DoneMessage state={state} patternLabel={label} />
              </div>
            ) : null}
          </ChatThread>

          <div className="flex min-h-[9.75rem] items-center border-t border-line bg-ink-900/70 px-3 py-3 sm:px-5 sm:py-4">
            {state.phase === "rating" || state.phase === "grading" ? (
              turn?.evaluation ? (
                <div
                  ref={ratingRef}
                  tabIndex={-1}
                  aria-labelledby="rate-label"
                  className="w-full rounded-2xl focus-visible:outline-offset-4"
                >
                  <p id="rate-label" className="mb-2 text-center text-xs font-medium text-fg-muted">
                    How was your recall? Tap back to schedule the next rep.
                  </p>
                  <TapbackButtons
                    preview={turn.evaluation.preview}
                    onRate={(grade, rating) => void rate(grade, rating)}
                    suggested={turn.evaluation.suggestedRating}
                    loading={state.phase === "grading" ? turn.rating ?? true : false}
                    label="How was your recall?"
                  />
                </div>
              ) : null
            ) : state.phase === "graded" ? (
              <p className="flex w-full items-center justify-center gap-2 text-sm text-fg-muted" role="status">
                <Spinner size="sm" label="" />
                Saved. Next card coming up…
              </p>
            ) : state.phase === "done" ? (
              <div ref={doneRef} className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
                {state.exhausted ? (
                  <ButtonLink href="/practice">Practice a problem</ButtonLink>
                ) : (
                  <>
                    <Button onClick={studyNew} leftIcon={<span aria-hidden="true">✨</span>}>
                      Study new cards
                    </Button>
                    <ButtonLink href="/practice" variant="secondary">
                      Practice a problem
                    </ButtonLink>
                  </>
                )}
                <ButtonLink href="/" variant="ghost">
                  Dashboard
                </ButtonLink>
              </div>
            ) : state.phase === "error" ? (
              <p className="w-full text-center text-sm text-fg-muted">Check that the Synapse server is running, then retry.</p>
            ) : (
              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={() => void submit(draft, false)}
                onHint={() => act({ type: "hint" })}
                onGiveUp={() => void submit(IDK_ANSWER, true)}
                onSkip={skip}
                enabled={state.phase === "answering"}
                busy={state.phase === "evaluating"}
                hintShown={turn?.hintShown ?? false}
                textareaRef={textareaRef}
              />
            )}
          </div>
        </Card>

        <SessionSidebar tag={tag} tally={state.tally} queue={state.queue} current={turn} mode={state.mode} />
      </div>

      <p className="sr-only" aria-live="polite">
        {reviewed > 0 ? `${plural(reviewed, "card")} reviewed this session.` : ""}
      </p>
    </>
  );
}

function DoneMessage({ state, patternLabel: label }: { state: SessionState; patternLabel: string | null }) {
  const reviewed = reviewedCount(state);
  const nextIn = state.empty?.nextDueIn;
  const summary =
    reviewed > 0
      ? `You reviewed ${plural(reviewed, "card")}: ❤️ ${state.tally.love} · 👍 ${state.tally.like} · 👎 ${state.tally.dislike}.`
      : null;

  if (state.exhausted) {
    return (
      <EmptyState
        icon="🏆"
        title={label ? `You've seen every ${label} card` : "You've seen every card"}
        description={`${summary ? `${summary} ` : ""}${nextIn ? `Your next review is due in ${nextIn}.` : "Reviews will appear here as they come due."}`}
      />
    );
  }

  const title = label ? `Nothing due in ${label}` : "All caught up";
  const description = nextIn ? `Next card due in ${nextIn}.` : "Nothing is scheduled yet.";

  if (state.turns.length === 0) {
    return (
      <EmptyState
        icon="🎉"
        title={`${title}. ${description}`}
        description="Study new cards past today's limit, or practice a problem in the card-flip IDE. Prepr will text you when reviews come due."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ChatBubble from="agent" tail={!summary}>
        {`🎉 ${title}. ${description}`}
      </ChatBubble>
      {summary ? <ChatBubble from="agent">{summary}</ChatBubble> : null}
    </div>
  );
}
