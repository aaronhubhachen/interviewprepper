"use client";

import { LANGUAGE_LABELS } from "@synapse/core/judge";

import { useEffect, useRef, type ReactNode } from "react";
import type { TextGrade } from "@synapse/core/tapback";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatClock, plural } from "@/lib/format";
import type { ClientProblem } from "@/lib/types";
import { ConfirmButton, RATING_META, VERDICT_META } from "./bits";
import {
  allSyncs,
  bestSubmit,
  codeGrade,
  drillMessage,
  flaggedTags,
  hintsUsed,
  latestSchedule,
  STAGE_META,
  totalActiveMs,
  type PracticeSession,
  type StageKey,
  type TextStageKey,
} from "./session";

const GRADE_RATING: Record<TextGrade, keyof typeof RATING_META> = { 5: "love", 3: "like", 1: "dislike" };

function StageTile({ stage, children, onReview }: { stage: StageKey; children: ReactNode; onReview: () => void }) {
  const meta = STAGE_META[stage];
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-ink-900/60 p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        <span aria-hidden="true">{meta.icon} </span>
        Stage {meta.number} · {meta.title}
      </p>
      <div className="mt-2 flex-1 space-y-1 text-sm">{children}</div>
      <Button variant="ghost" size="sm" className="-ml-3 mt-2 self-start" onClick={onReview} aria-label={`Review stage ${meta.number}, ${meta.title}`}>
        Review <span aria-hidden="true">→</span>
      </Button>
    </li>
  );
}

function TextStageSummary({ session, stage }: { session: PracticeSession; stage: TextStageKey }) {
  const state = session[stage];
  const verdict = state.result ? VERDICT_META[state.result.evaluation.verdict] : null;
  return (
    <>
      <p className="font-medium text-fg">
        {state.revealed ? "📖 Revealed" : verdict ? `${verdict.emoji} ${verdict.label}` : "—"}
        {state.rating ? (
          <span className="font-normal text-fg-muted">
            {" "}
            · {RATING_META[state.rating].emoji} {RATING_META[state.rating].label}
          </span>
        ) : null}
      </p>
      <p className="text-fg-subtle">
        {formatClock(state.activeMs)}
        {state.hintShown ? " · hint used" : ""}
        {state.sync?.struggled ? " · flagged" : ""}
      </p>
    </>
  );
}

export function CompletionPanel({
  problem,
  session,
  nextProblem,
  onRestart,
  onReview,
  onShowSolution,
  solutionShown,
  autoFocus,
}: {
  problem: ClientProblem;
  session: PracticeSession;
  nextProblem: { id: string; title: string } | null;
  onRestart: () => void;
  onReview: (stage: StageKey) => void;
  onShowSolution: () => void;
  solutionShown: boolean;
  autoFocus?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) headingRef.current?.focus({ preventScroll: true });
    // Only when first shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const struggled = allSyncs(session).some((sync) => sync.struggled);
  const graded = codeGrade(session);
  const schedule = latestSchedule(session);
  const flagged = flaggedTags(session);
  const { code } = session;
  const headline = code.gaveUp
    ? { emoji: "📖", title: "Solution unlocked", sub: "No shame in it: the drills are queued so this pattern sticks next time." }
    : struggled
      ? { emoji: "🧩", title: "Solved, with a fight", sub: "Prepr will keep this one close and drill the weak spots over iMessage." }
      : { emoji: "🎉", title: "Clean solve", sub: "Invariant, trap and code all landed. Prepr will space this one out." };
  const acceptedOn = code.submits > 0 && !code.gaveUp ? code.submits : null;
  const best = bestSubmit(code);

  return (
    <Card glow as="article" aria-labelledby="completion-heading" className="motion-safe:animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">Problem complete</p>
      <h2 id="completion-heading" ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-semibold text-fg outline-none sm:text-3xl">
        <span aria-hidden="true">{headline.emoji} </span>
        {headline.title}
      </h2>
      <p className="mt-2 text-base text-fg-muted">{headline.sub}</p>

      {graded ? (
        <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong bg-ink-800 px-3.5 py-2 text-sm text-fg">
          <span aria-hidden="true">{RATING_META[GRADE_RATING[graded.grade]].emoji}</span>
          <span>
            Code stage graded <span className="font-semibold">{RATING_META[GRADE_RATING[graded.grade]].label}</span>
            <span className="text-fg-muted"> · next review in </span>
            <span className="font-semibold tabular-nums text-axon-soft">{graded.nextLabel}</span>
          </span>
        </p>
      ) : !code.syncs.some((sync) => sync.saved) ? (
        <p className="mt-4 text-sm text-warning">This run wasn&apos;t saved, so the problem card was not rescheduled.</p>
      ) : null}

      <ol className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Stage summary">
        <StageTile stage="invariant" onReview={() => onReview("invariant")}>
          <TextStageSummary session={session} stage="invariant" />
        </StageTile>
        <StageTile stage="edgeCase" onReview={() => onReview("edgeCase")}>
          <TextStageSummary session={session} stage="edgeCase" />
        </StageTile>
        <StageTile stage="code" onReview={() => onReview("code")}>
          <p className="font-medium text-fg">
            {code.gaveUp ? "🏳️ Gave up" : "✅ Accepted"}
            <span className="font-normal text-fg-muted"> · {LANGUAGE_LABELS[code.language]}</span>
          </p>
          <p className="text-fg-subtle">
            {formatClock(code.activeMs)}
            {acceptedOn ? ` · ${acceptedOn === 1 ? "first submit" : `submit #${acceptedOn}`}` : ""}
            {best && code.gaveUp ? ` · best ${best.passed}/${best.total}` : ""}
            {code.runs > 0 ? ` · ${plural(code.runs, "run")}` : ""}
          </p>
        </StageTile>
      </ol>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-fg-subtle">Total time</dt>
          <dd className="font-semibold tabular-nums text-fg">{formatClock(totalActiveMs(session))}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Hints</dt>
          <dd className="font-semibold tabular-nums text-fg">{hintsUsed(session)}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Submissions</dt>
          <dd className="font-semibold tabular-nums text-fg">{code.submits}</dd>
        </div>
      </dl>

      {schedule?.scheduled ? (
        <Banner
          tone="synapse"
          icon="📲"
          className="mt-5"
          title={drillMessage(flagged, schedule.scheduled)}
          action={
            flagged[0] ? (
              <ButtonLink href={`/review?tag=${flagged[0].tag}`} size="sm" variant="secondary">
                Drill now
              </ButtonLink>
            ) : undefined
          }
        >
          {schedule.scheduled.titles.join(" · ")}
        </Banner>
      ) : struggled && problem.weakTags.length > 0 ? (
        <p className="mt-5 text-sm text-fg-muted">
          Noted: {problem.weakTags.map((ref) => ref.label).join(" and ")} {problem.weakTags.length === 1 ? "needs" : "need"} more reps.
        </p>
      ) : null}

      <div className={cn("mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5")}>
        {nextProblem ? (
          <ButtonLink href={`/practice/${nextProblem.id}`} rightIcon={<span aria-hidden="true">→</span>}>
            Next: {nextProblem.title}
          </ButtonLink>
        ) : (
          <ButtonLink href="/practice" rightIcon={<span aria-hidden="true">→</span>}>
            All problems
          </ButtonLink>
        )}
        {!solutionShown ? (
          <Button variant="secondary" onClick={onShowSolution} leftIcon={<span aria-hidden="true">📖</span>}>
            View solution
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => onReview("code")} leftIcon={<span aria-hidden="true">⌨️</span>}>
          Keep coding
        </Button>
        <ConfirmButton size="md" variant="ghost" confirmVariant="secondary" confirmLabel="Start over" prompt="Run all three stages again?" onConfirm={onRestart} leftIcon={<span aria-hidden="true">↻</span>}>
          Practice again
        </ConfirmButton>
      </div>
    </Card>
  );
}
