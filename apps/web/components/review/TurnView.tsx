"use client";

import Link from "next/link";
import { VERDICT_EMOJI } from "@synapse/core/grading";
import { compactLegend, TAPBACK_EMOJI } from "@synapse/core/tapback";
import { humanizeDuration } from "@synapse/core/time";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { Pill, TagPill } from "@/components/ui/Pill";
import type { ReviewEvaluateResponse } from "@/lib/types";
import { REASON_META, gradedMessage, inferDayMs, isDemoDayMs, type SessionPhase, type Turn } from "./session";

const DIFFICULTY = { 1: "Easy", 2: "Medium", 3: "Hard" } as const;

export interface TurnViewProps {
  turn: Turn;
  /** The turn the composer is acting on (shows the typing indicator). */
  isCurrent: boolean;
  phase: SessionPhase;
}

/** One card's exchange, iMessage-style: prompt → (hint) → answer → feedback → answer key → tapback → confirmation. */
export function TurnView({ turn, isCurrent, phase }: TurnViewProps) {
  const { card, reason, weakTags, state } = turn.next;
  const meta = REASON_META[reason];
  const weak = new Set(weakTags.map((entry) => entry.tag));
  const dayMs = inferDayMs(turn.next.preview);

  return (
    <article aria-label={`Card: ${card.title}`} className="flex flex-col gap-3">
      <header data-anchor className="flex flex-col items-center gap-2 pt-3 text-center">
        <p className="text-xs font-medium text-fg-subtle">
          <span className="text-fg-muted">{card.title}</span>
          <span aria-hidden="true"> · </span>
          <span>{DIFFICULTY[card.difficulty]}</span>
          <span aria-hidden="true"> · </span>
          <span>{phaseLabel(state.phase, state.intervalDays, state.lapses)}</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Pill tone={meta.tone} icon={meta.icon} title={meta.description}>
            {meta.label}
          </Pill>
          {card.tags.map((tag) => (
            <TagPill key={tag} tag={tag} weak={weak.has(tag)} />
          ))}
          {card.kind === "problem" && card.problemId ? (
            <Link
              href={`/practice/${encodeURIComponent(card.problemId)}`}
              className="rounded-full text-xs font-medium text-axon hover:text-axon-soft"
            >
              Open in IDE →
            </Link>
          ) : null}
        </div>
      </header>

      <ChatBubble from="agent" name="Prepr" tail={!turn.hintShown}>
        {card.prompt}
      </ChatBubble>

      {turn.hintShown ? (
        <ChatBubble from="agent" meta="Hint">
          💡 {card.hint}
        </ChatBubble>
      ) : null}

      {turn.answer !== null ? (
        <div data-anchor>
          <ChatBubble from="you" meta={turn.gaveUp ? "Asked for the answer" : "Delivered"}>
            {turn.gaveUp ? "🤷 I don't know" : turn.answer}
          </ChatBubble>
        </div>
      ) : null}

      {turn.skipped ? <p className="text-center text-xs text-fg-subtle">Skipped. It stays in your queue.</p> : null}

      {isCurrent && phase === "evaluating" ? <ChatBubble from="agent" typing /> : null}

      {turn.evaluation ? (
        <>
          <div data-anchor>
            <FeedbackBubble evaluation={turn.evaluation} gaveUp={turn.gaveUp} />
          </div>
          <AnswerKey evaluation={turn.evaluation} />
          <ChatBubble
            from="agent"
            tapback={turn.result ? TAPBACK_EMOJI[turn.result.rating] : undefined}
            meta={turn.result ? undefined : `Prepr suggests ${TAPBACK_EMOJI[turn.evaluation.suggestedRating]}`}
          >
            {`Rate your recall with a tapback:\n${compactLegend(turn.evaluation.preview)}`}
          </ChatBubble>
        </>
      ) : null}

      {turn.result ? (
        <div data-anchor>
          <ChatBubble
            from="agent"
            meta={
              isDemoDayMs(dayMs) && turn.gradedAt !== null
                ? `⚡ Demo time: back in about ${humanizeDuration(Math.max(0, turn.result.dueAt - turn.gradedAt))}`
                : undefined
            }
          >
            {gradedMessage(turn.result.rating, turn.result.nextLabel)}
          </ChatBubble>
        </div>
      ) : null}
    </article>
  );
}

function phaseLabel(phase: string, intervalDays: number, lapses: number): string {
  if (phase === "new") return "New card";
  if (phase === "learning") return "Learning";
  if (phase === "relearning") return lapses > 0 ? `Relearning · ${lapses} lapse${lapses === 1 ? "" : "s"}` : "Relearning";
  return intervalDays > 0 ? `Review · last interval ${Math.round(intervalDays)}d` : "Review";
}

function FeedbackBubble({ evaluation, gaveUp }: { evaluation: ReviewEvaluateResponse; gaveUp: boolean }) {
  const { verdict, feedback, nailed, source } = evaluation.evaluation;
  const covered = new Set(nailed.map((label) => label.toLowerCase()));
  const text = gaveUp ? "No problem. Here is what a strong answer covers:" : `${VERDICT_EMOJI[verdict]} ${feedback}`;
  return (
    <ChatBubble from="agent" meta={source === "llm" ? "Graded by the LLM" : "Graded by key points"}>
      {text}
      {evaluation.keyPoints.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5 whitespace-normal" aria-label="Key points">
          {evaluation.keyPoints.map((label) => {
            const hit = covered.has(label.toLowerCase());
            return (
              <li key={label} className="max-w-full">
                <Pill tone={hit ? "success" : "warning"} icon={hit ? "✓" : "✗"} wrap>
                  <span className="sr-only">{hit ? "Covered: " : "Missed: "}</span>
                  {label}
                </Pill>
              </li>
            );
          })}
        </ul>
      ) : null}
    </ChatBubble>
  );
}

/** The "flip": the answer key revealed after you answer, with the deeper why behind a disclosure. */
function AnswerKey({ evaluation }: { evaluation: ReviewEvaluateResponse }) {
  const { relatedProblem, problemId } = evaluation;
  return (
    <div className="flex w-full justify-start motion-safe:animate-fade-up">
      <section
        aria-label="Answer key"
        className="relative max-w-[85%] rounded-bubble rounded-bl-md border border-synapse/35 bg-[linear-gradient(160deg,rgb(249_115_22/0.16),rgb(23_23_23/0.9)_55%)] px-4 py-3 shadow-glow sm:max-w-[75%]"
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-synapse-soft">
          <span aria-hidden="true">🔑 </span>Answer key
        </p>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-fg">{evaluation.answerKey}</p>
        {evaluation.explanation ? (
          <details className="group mt-2">
            <summary className="cursor-pointer list-none text-sm font-medium text-axon hover:text-axon-soft [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="mr-1 inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              Why it works
            </summary>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{evaluation.explanation}</p>
          </details>
        ) : null}
        {relatedProblem || problemId ? (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {problemId ? (
              <Link href={`/practice/${encodeURIComponent(problemId)}`} className="font-medium text-axon hover:text-axon-soft">
                🧩 Practice in the IDE
              </Link>
            ) : null}
            {relatedProblem ? (
              <a
                href={`https://leetcode.com/problems/${encodeURIComponent(relatedProblem.leetcodeSlug)}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-fg-muted hover:text-fg"
              >
                LeetCode: {relatedProblem.title} <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </p>
        ) : null}
      </section>
    </div>
  );
}
