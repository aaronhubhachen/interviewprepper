"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import type { Rating } from "@synapse/core/sm2";
import type { TextGrade } from "@synapse/core/tapback";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Kbd } from "@/components/ui/Kbd";
import { Pill } from "@/components/ui/Pill";
import { TapbackButtons } from "@/components/ui/TapbackButtons";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import type { ClientStagePrompt } from "@/lib/types";
import { RATING_META, StageTimer, VERDICT_META } from "./bits";
import { FlipCard } from "./FlipCard";
import { evaluationRetry, STAGE_META, type TextStageKey, type TextStageState } from "./session";

const MAX_ANSWER = 4000;

const QUESTION: Record<TextStageKey, { heading: string; placeholder: string }> = {
  invariant: {
    heading: "Name the invariant",
    placeholder: "In 1–2 sentences: what stays true at every step, and how do you restore it?",
  },
  edgeCase: {
    heading: "Spot the edge-case trap",
    placeholder: "Which input breaks the naive version, and what guards against it?",
  },
};

export interface TextStageCardProps {
  stage: TextStageKey;
  prompt: ClientStagePrompt;
  state: TextStageState;
  /** Completed earlier: show the graded back face, read-only. */
  readOnly: boolean;
  evaluating: boolean;
  evalError: string | null;
  /** The failed evaluation was "I'm stuck": Retry reveals again instead of grading the draft. */
  evalErrorRevealed?: boolean;
  /** Rating whose attempt is being saved. */
  saving: Rating | null;
  saveError: string | null;
  getElapsed: () => number;
  onDraft: (text: string) => void;
  onHint: () => void;
  onEvaluate: (revealed: boolean) => void;
  onRate: (grade: TextGrade, rating: Rating) => void;
  onSkipSave: () => void;
  /** Focus the heading after mount (a freshly dealt stage). */
  autoFocus?: boolean;
}

export function TextStageCard(props: TextStageCardProps) {
  const { state, readOnly } = props;
  const backHeading = useRef<HTMLHeadingElement>(null);
  const frontHeading = useRef<HTMLHeadingElement>(null);
  const flipped = state.result !== null;

  useEffect(() => {
    if (!props.autoFocus) return;
    (flipped ? backHeading : frontHeading).current?.focus({ preventScroll: true });
    // Only when the card is first dealt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FlipCard
      flipped={flipped}
      onFlipped={(side) => (side === "back" ? backHeading : frontHeading).current?.focus({ preventScroll: true })}
      front={<Front {...props} headingRef={frontHeading} />}
      back={<Back {...props} headingRef={backHeading} readOnly={readOnly} />}
    />
  );
}

function StageEyebrow({ stage }: { stage: TextStageKey }) {
  const meta = STAGE_META[stage];
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">
      <span aria-hidden="true">{meta.icon} </span>
      Stage {meta.number} of 3 · {meta.title}
    </p>
  );
}

function Front({
  stage,
  prompt,
  state,
  evaluating,
  evalError,
  evalErrorRevealed = false,
  getElapsed,
  onDraft,
  onHint,
  onEvaluate,
  headingRef,
}: TextStageCardProps & { headingRef: RefObject<HTMLHeadingElement | null> }) {
  const answerId = useId();
  const hintId = useId();
  const countId = useId();
  const [slow, setSlow] = useState(false);
  const question = QUESTION[stage];
  const trimmed = state.draft.trim();

  useEffect(() => {
    if (!evaluating) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, [evaluating]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!trimmed || evaluating) return;
    onEvaluate(false);
  };

  // Retry repeats what failed: a failed "I'm stuck" reveals again rather than grading a partial draft.
  const retry = evaluationRetry(evalErrorRevealed, state.draft);

  return (
    <Card glow as="article" aria-labelledby={`${answerId}-heading`} className="overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <StageEyebrow stage={stage} />
        <StageTimer getElapsed={getElapsed} />
      </div>
      <h2 id={`${answerId}-heading`} ref={headingRef} tabIndex={-1} className="mt-3 text-xl font-semibold text-fg outline-none sm:text-2xl">
        {question.heading}
      </h2>
      <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-fg">{prompt.prompt}</p>

      <form className="mt-5 space-y-3" onSubmit={submit} aria-busy={evaluating || undefined}>
        <label htmlFor={answerId} className="text-sm font-medium text-fg-muted">
          Your answer
        </label>
        <textarea
          id={answerId}
          value={state.draft}
          onChange={(event) => onDraft(event.target.value.slice(0, MAX_ANSWER))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          readOnly={evaluating}
          rows={5}
          maxLength={MAX_ANSWER}
          placeholder={question.placeholder}
          aria-describedby={cn(countId, state.hintShown && hintId) || undefined}
          className={cn(
            "block min-h-32 w-full resize-y rounded-2xl border border-line-strong bg-ink-900/80 px-4 py-3 text-[0.9375rem] leading-relaxed text-fg",
            "placeholder:text-fg-subtle focus-visible:border-synapse/60 focus-visible:outline-2 focus-visible:outline-offset-0",
            evaluating && "opacity-70",
          )}
        />
        <div className="flex items-center justify-between gap-3 text-xs text-fg-subtle">
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Kbd>Ctrl</Kbd>
            <span aria-hidden="true">+</span>
            <Kbd>Enter</Kbd>
            <span>to check</span>
          </span>
          <span id={countId} className="ml-auto tabular-nums">
            {state.draft.length}/{MAX_ANSWER}
            <span className="sr-only"> characters</span>
          </span>
        </div>

        {state.hintShown ? (
          <div id={hintId} role="note" className="flex gap-3 rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-fg motion-safe:animate-fade-up">
            <span aria-hidden="true">💡</span>
            <p>
              <span className="sr-only">Hint: </span>
              {prompt.hint}
            </p>
          </div>
        ) : null}

        {evalError ? (
          <Banner
            tone="danger"
            title={evalErrorRevealed ? "Couldn't reveal the answer" : "Couldn't grade that answer"}
            action={
              <Button
                size="sm"
                variant="secondary"
                disabled={retry === null || evaluating}
                onClick={() => {
                  if (retry !== null && !evaluating) onEvaluate(retry);
                }}
              >
                Retry
              </Button>
            }
          >
            {evalError}
          </Banner>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" leftIcon={<span aria-hidden="true">💡</span>} onClick={onHint} disabled={state.hintShown || evaluating} aria-expanded={state.hintShown}>
              {state.hintShown ? "Hint shown" : "Hint"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<span aria-hidden="true">🙈</span>}
              onClick={() => onEvaluate(true)}
              disabled={evaluating}
              title="Reveal the answer key (counts as a struggle)"
            >
              I&apos;m stuck
            </Button>
          </div>
          <Button type="submit" loading={evaluating} loadingLabel="Grading your answer" disabled={!trimmed} rightIcon={<span aria-hidden="true">→</span>}>
            {evaluating ? "Grading…" : "Check answer"}
          </Button>
        </div>
        <p role="status" className={cn("min-h-5 text-sm text-fg-muted", !evaluating && "sr-only")}>
          {evaluating ? (slow ? "🧠 Still thinking: the model is reasoning through your answer…" : "🧠 Grading your answer against the key points…") : ""}
        </p>
      </form>
    </Card>
  );
}

function Back({
  stage,
  state,
  readOnly,
  saving,
  saveError,
  onRate,
  onSkipSave,
  headingRef,
}: TextStageCardProps & { headingRef: RefObject<HTMLHeadingElement | null> }) {
  const headingId = useId();
  // The 3/2/1 rating shortcuts only fire while focus is inside this card (WCAG 2.1.4). tabIndex -1 keeps a
  // click on the card's text inside the scope instead of dropping focus to <body>.
  const scopeRef = useRef<HTMLElement>(null);
  const result = state.result;
  if (!result) return null;
  const verdict = VERDICT_META[result.evaluation.verdict];
  const headline = state.revealed ? "📖 Answer revealed" : `${verdict.emoji} ${verdict.headline}`;
  const nailed = new Set(result.evaluation.nailed.map((label) => label.toLowerCase()));
  const missed = new Set(result.evaluation.missed.map((label) => label.toLowerCase()));

  return (
    <Card ref={scopeRef} tabIndex={-1} glow as="article" aria-labelledby={headingId} className="overflow-hidden outline-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StageEyebrow stage={stage} />
        <div className="flex items-center gap-2">
          <Pill tone={state.revealed ? "neutral" : verdict.tone}>{state.revealed ? "Revealed" : verdict.label}</Pill>
          <Pill tone="cyan" title={result.evaluation.source === "llm" ? "Graded by the Prepr model" : "Graded against the key points (offline)"}>
            {result.evaluation.source === "llm" ? "AI feedback" : "Key-point check"}
          </Pill>
        </div>
      </div>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="mt-3 text-xl font-semibold text-fg outline-none sm:text-2xl">
        {headline}
      </h2>
      {!state.revealed && result.evaluation.feedback ? <p className="mt-2 text-base leading-relaxed text-fg">{result.evaluation.feedback}</p> : null}

      {result.keyPoints.length > 0 ? (
        <section aria-label="Key points" className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">Key points</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {result.keyPoints.map((point) => {
              const hit = !state.revealed && nailed.has(point.toLowerCase()) && !missed.has(point.toLowerCase());
              return (
                <li
                  key={point}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                    hit ? "border-success/35 bg-success/10 text-fg" : "border-line bg-ink-900/60 text-fg-muted",
                  )}
                >
                  <span aria-hidden="true" className={cn("mt-px font-semibold", hit ? "text-success" : "text-fg-subtle")}>
                    {hit ? "✓" : "○"}
                  </span>
                  <span>
                    {point}
                    <span className="sr-only">{hit ? " (covered)" : " (not covered)"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-label="Answer key" className="mt-5 rounded-2xl border border-synapse/30 bg-synapse/10 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-synapse-soft">Answer key</h3>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-fg">{result.answerKey}</p>
      </section>

      {!state.revealed && result.answer.trim() ? (
        <details className="group mt-3 rounded-2xl border border-line bg-ink-900/60 px-4 py-2 text-sm">
          <summary className="cursor-pointer select-none py-1 font-medium text-fg-muted marker:text-fg-subtle hover:text-fg">Your answer</summary>
          <p className="whitespace-pre-wrap pb-2 pt-1 text-fg-muted">{result.answer}</p>
        </details>
      ) : null}

      <div className="mt-6 border-t border-line pt-5">
        {readOnly && state.rating ? (
          <p className="mb-3 text-sm text-fg-muted">
            You rated this <span className="font-medium text-fg">{RATING_META[state.rating].emoji} {RATING_META[state.rating].label}</span>
            {" · "}
            {formatClock(state.activeMs)} on this stage
            {state.hintShown ? " · hint used" : ""}
            {state.sync && !state.sync.saved ? " · not saved" : ""}
          </p>
        ) : (
          <p className="mb-3 text-sm font-medium text-fg">
            How confident were you?{" "}
            <span className="font-normal text-fg-muted">Rate honestly: 👎 schedules a drill over iMessage.</span>
          </p>
        )}
        <TapbackButtons
          onRate={onRate}
          suggested={readOnly ? undefined : result.suggestedRating}
          selected={readOnly ? (state.rating ?? undefined) : undefined}
          loading={saving ?? false}
          disabled={readOnly}
          keyboard={!readOnly}
          keyboardScope={scopeRef}
          label="How confident were you?"
        />
        {saveError ? (
          <Banner
            tone="danger"
            className="mt-4"
            title="Couldn't save your rating"
            action={
              <Button size="sm" variant="ghost" onClick={onSkipSave}>
                Continue without saving
              </Button>
            }
          >
            {saveError} Tap a rating to retry.
          </Banner>
        ) : null}
      </div>
    </Card>
  );
}
