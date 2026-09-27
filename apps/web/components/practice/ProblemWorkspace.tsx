"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import type { JudgeLanguage, Tag } from "@synapse/core/content";
import type { Rating } from "@synapse/core/sm2";
import type { TextGrade } from "@synapse/core/tapback";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, errorMessage, fetchProblem, fetchProblems, fetchSolution, fetchStats, evaluateStageAnswer, recordAttempt } from "@/lib/api";
import type { JudgeOutcome } from "@/lib/judge";
import type { ClientProblem, PracticeAttemptRequest, PracticeAttemptResponse, ProblemResponse } from "@/lib/types";
import { ConfirmButton, DifficultyPill } from "./bits";
import { CodeStagePanel } from "./CodeStagePanel";
import { CompletionPanel } from "./CompletionPanel";
import { ProblemStatement } from "./ProblemStatement";
import { SolutionPanel, type SolutionState } from "./SolutionPanel";
import { StageStepper } from "./StageStepper";
import { TextStageCard } from "./TextStageCard";
import {
  canGiveUp,
  codeAttemptRequest,
  drillMessage,
  LANGUAGE_STORAGE_KEY,
  latestSchedule,
  newSession,
  parseSession,
  safeStorage,
  sessionReducer,
  sessionStorageKey,
  flaggedTags,
  STAGE_META,
  syncFromResponse,
  textAttemptRequest,
  textStagePassed,
  unsavedSync,
  type StageKey,
  type TextStageKey,
} from "./session";

const sessionStore = safeStorage("session");
const localStore = safeStorage("local");

interface ActiveClock {
  stage: StageKey | null;
  base: number;
  since: number | null;
}

type SaveError =
  | { stage: TextStageKey; message: string; grade: TextGrade; rating: Rating; activeMs: number }
  | { stage: "code"; message: string; retry: () => void; skip: (() => void) | null };

function clockNow(): number {
  return typeof performance === "object" ? performance.now() : Date.now();
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function ProblemWorkspace({ problem }: { problem: ClientProblem }) {
  const { toast } = useToast();
  const [session, dispatch] = useReducer(sessionReducer, problem.id, (id: string) => newSession(id, 0));
  const [hydrated, setHydrated] = useState(false);
  const [detail, setDetail] = useState<ProblemResponse | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [weak, setWeak] = useState<ReadonlySet<Tag>>(() => new Set());
  const [viewing, setViewing] = useState<StageKey | null>(null);
  const [evaluating, setEvaluating] = useState<TextStageKey | null>(null);
  /** `revealed`: the failed request was "I'm stuck", so Retry reveals again instead of grading the draft. */
  const [evalError, setEvalError] = useState<{ stage: TextStageKey; message: string; revealed: boolean } | null>(null);
  const [saving, setSaving] = useState<{ stage: StageKey; rating?: Rating } | null>(null);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [solution, setSolution] = useState<SolutionState>({ status: "idle" });
  const [nextProblem, setNextProblem] = useState<{ id: string; title: string } | null>(null);
  const [bannerDismissedAt, setBannerDismissedAt] = useState(0);
  const [dealt, setDealt] = useState(false);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const columnRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const storageKey = sessionStorageKey(problem.id);

  // ── hydrate + persist the session ─────────────────────────────────────

  useEffect(() => {
    const stored = parseSession(sessionStore.getItem(storageKey), problem.id);
    const preferred: JudgeLanguage = localStore.getItem(LANGUAGE_STORAGE_KEY) === "python" ? "python" : "javascript";
    dispatch({ type: "restore", session: stored ?? newSession(problem.id, Date.now(), preferred) });
    setHydrated(true);
  }, [problem.id, storageKey]);

  useEffect(() => {
    if (hydrated) sessionStore.setItem(storageKey, JSON.stringify(session));
  }, [hydrated, session, storageKey]);

  // ── active time per stage (pauses while the tab is hidden) ────────────

  const clock = useRef<ActiveClock>({ stage: null, base: 0, since: null });
  const elapsed = useCallback(() => {
    const current = clock.current;
    return current.base + (current.since === null ? 0 : clockNow() - current.since);
  }, []);

  // Layout effect: runs before child effects, so a freshly dealt stage never shows the previous stage's time.
  useLayoutEffect(() => {
    if (!hydrated) return;
    const state = sessionRef.current;
    const stage = state.current === "done" ? null : state.current;
    const base = stage === null ? 0 : stage === "code" ? state.code.activeMs : state[stage].activeMs;
    clock.current = { stage, base, since: stage && document.visibilityState === "visible" ? clockNow() : null };
  }, [hydrated, session.current]);

  useEffect(() => {
    const persistTime = () => {
      const { stage } = clock.current;
      if (!stage) return;
      const action = { type: "time" as const, stage, activeMs: elapsed() };
      dispatch(action);
      // Write synchronously too: on pagehide there may be no further render.
      sessionStore.setItem(storageKey, JSON.stringify(sessionReducer(sessionRef.current, action)));
    };
    const onVisibility = () => {
      const current = clock.current;
      if (document.visibilityState === "hidden") {
        if (current.since !== null) {
          current.base += clockNow() - current.since;
          current.since = null;
        }
        persistTime();
      } else if (current.stage && current.since === null) {
        current.since = clockNow();
      }
    };
    window.addEventListener("pagehide", persistTime);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", persistTime);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [elapsed, storageKey]);

  // ── server data: progress, weak tags ──────────────────────────────────

  const loadDetail = useCallback(
    (signal?: AbortSignal) => {
      fetchProblem(problem.id, { signal })
        .then((next) => {
          setDetail(next);
          setNow(Date.now());
        })
        .catch(() => {
          // Progress is decorative here; the stages still work without it.
        });
    },
    [problem.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadDetail(controller.signal);
    fetchStats({ signal: controller.signal })
      .then((stats) => setWeak(new Set(stats.weakTags.map((entry) => entry.tag))))
      .catch(() => undefined);
    return () => controller.abort();
  }, [loadDetail]);

  // ── struggle → sync feedback ──────────────────────────────────────────

  const announce = useCallback(
    (response: PracticeAttemptResponse) => {
      if (response.scheduled && response.flaggedTags.length > 0) {
        toast({
          tone: "synapse",
          icon: "📲",
          duration: 9000,
          title: drillMessage(response.flaggedTags, response.scheduled),
          description: response.scheduled.titles.join(" · "),
        });
        setWeak((previous) => new Set([...previous, ...response.flaggedTags.map((ref) => ref.tag)]));
      } else if (response.struggled && !response.scheduled && response.message) {
        toast({ tone: "info", icon: "🧩", title: response.message });
      }
    },
    [toast],
  );

  const revealNextStage = useCallback(() => {
    setDealt(true);
    setViewing(null);
    const column = columnRef.current;
    if (column && column.getBoundingClientRect().top < 64) {
      column.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, []);

  // ── stages 1 and 2 ─────────────────────────────────────────────────────

  const evaluate = useCallback(
    async (stage: TextStageKey, revealed: boolean) => {
      const draft = sessionRef.current[stage].draft.trim();
      // "I'm stuck" sends a recognised non-answer: graded instantly, answer key revealed.
      const answer = revealed ? "I don't know" : draft;
      if (!answer) return;
      setEvaluating(stage);
      setEvalError(null);
      try {
        const response = await evaluateStageAnswer({ problemId: problem.id, stage, answer });
        dispatch({
          type: "evaluated",
          stage,
          revealed,
          result: {
            answer,
            evaluation: response.evaluation,
            answerKey: response.answerKey,
            keyPoints: response.keyPoints,
            suggestedRating: revealed ? "dislike" : response.suggestedRating,
          },
        });
      } catch (error) {
        setEvalError({ stage, message: errorMessage(error), revealed });
      } finally {
        setEvaluating(null);
      }
    },
    [problem.id],
  );

  const rate = useCallback(
    async (stage: TextStageKey, grade: TextGrade, rating: Rating) => {
      const current = sessionRef.current;
      if (saving || current[stage].sync || !current[stage].result) return;
      const activeMs = clock.current.stage === stage ? elapsed() : current[stage].activeMs;
      setSaving({ stage, rating });
      setSaveError(null);
      try {
        const response = await recordAttempt(textAttemptRequest(current, stage, grade, activeMs));
        dispatch({ type: "completeText", stage, rating, sync: syncFromResponse(response, Date.now()), activeMs });
        announce(response);
        revealNextStage();
        loadDetail();
      } catch (error) {
        setSaveError({ stage, message: errorMessage(error), grade, rating, activeMs });
      } finally {
        setSaving(null);
      }
    },
    [announce, elapsed, loadDetail, revealNextStage, saving],
  );

  const skipTextSave = useCallback(
    (stage: TextStageKey) => {
      if (!saveError || saveError.stage !== stage) return;
      const state = sessionRef.current[stage];
      dispatch({
        type: "completeText",
        stage,
        rating: saveError.rating,
        sync: unsavedSync(textStagePassed(saveError.grade, state.revealed), Date.now()),
        activeMs: saveError.activeMs,
      });
      setSaveError(null);
      revealNextStage();
    },
    [revealNextStage, saveError],
  );

  // ── stage 3 ────────────────────────────────────────────────────────────

  const loadSolution = useCallback(async () => {
    setSolution({ status: "loading" });
    try {
      const data = await fetchSolution(problem.id);
      setSolution({ status: "ready", data });
      requestAnimationFrame(() => solutionRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" }));
    } catch (error) {
      const locked = error instanceof ApiError && error.status === 403;
      setSolution({ status: "error", locked, message: locked ? "Submit or give up on the code stage first." : errorMessage(error) });
    }
  }, [problem.id]);

  // Synchronous "a code attempt is being saved" flag (state lags a render behind the click that races it).
  const codeSavingRef = useRef(false);
  const saveCode = useCallback(
    async (request: PracticeAttemptRequest, meta: { completed: boolean; gaveUp: boolean; activeMs: number }): Promise<boolean> => {
      codeSavingRef.current = true;
      setSaving({ stage: "code" });
      setSaveError(null);
      try {
        const response = await recordAttempt(request);
        dispatch({ type: "codeSynced", sync: syncFromResponse(response, Date.now()), completed: meta.completed, gaveUp: meta.gaveUp, activeMs: meta.activeMs });
        announce(response);
        if (meta.completed) revealNextStage();
        loadDetail();
        return true;
      } catch (error) {
        setSaveError({
          stage: "code",
          message: errorMessage(error),
          retry: () => {
            void saveCode(request, meta).then((ok) => {
              if (ok && meta.gaveUp) void loadSolution();
            });
          },
          skip: meta.completed
            ? () => {
                dispatch({ type: "codeSynced", sync: unsavedSync(request.passed ?? false, Date.now()), completed: true, gaveUp: meta.gaveUp, activeMs: meta.activeMs });
                setSaveError(null);
                revealNextStage();
              }
            : null,
        });
        return false;
      } finally {
        codeSavingRef.current = false;
        setSaving(null);
      }
    },
    [announce, loadDetail, loadSolution, revealNextStage],
  );

  const onJudged = useCallback(
    (outcome: JudgeOutcome) => {
      if (!outcome.ok) return; // infrastructure problem: nothing to count
      const { report } = outcome;
      const current = sessionRef.current;
      const practice = current.code.completed || current.current !== "code";
      const counted = outcome.mode === "submit" && !practice && report.status !== "compile_error";
      const summary = { mode: outcome.mode, status: report.status, passed: report.passed, total: report.total, language: outcome.language, at: Date.now() };
      if (!counted) {
        dispatch({ type: "judged", summary, counted: false });
        return;
      }
      const passed = report.status === "accepted";
      const activeMs = elapsed();
      // Built before counting this submit: failedRuns = failed submissions BEFORE this one.
      const request = codeAttemptRequest(current, { passed, testsPassed: report.passed, testsTotal: report.total, activeMs });
      dispatch({ type: "judged", summary, counted: true });
      void saveCode(request, { completed: passed, gaveUp: false, activeMs });
    },
    [elapsed, saveCode],
  );

  const giveUp = useCallback(async () => {
    const current = sessionRef.current;
    // Never record a give-up while a save is in flight or on top of an accepted submit (saved or not).
    if (!canGiveUp(current.code, codeSavingRef.current)) return;
    const last = current.code.lastSubmit ?? current.code.last;
    const activeMs = elapsed();
    const request = codeAttemptRequest(current, { passed: false, gaveUp: true, testsPassed: last?.passed, testsTotal: last?.total, activeMs });
    if (await saveCode(request, { completed: true, gaveUp: true, activeMs })) void loadSolution();
  }, [elapsed, loadSolution, saveCode]);

  // ── completion: pick the next problem ─────────────────────────────────

  const isDone = session.current === "done";
  useEffect(() => {
    if (!isDone) return;
    const controller = new AbortController();
    fetchProblems({ signal: controller.signal })
      .then(({ problems }) => {
        const index = problems.findIndex((entry) => entry.id === problem.id);
        const ordered = [...problems.slice(index + 1), ...problems.slice(0, Math.max(0, index))].filter((entry) => entry.id !== problem.id);
        const pick = ordered.find((entry) => !entry.progress.solved) ?? ordered[0] ?? null;
        setNextProblem(pick ? { id: pick.id, title: pick.title } : null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isDone, problem.id]);

  // Focus the code stage heading when it is dealt.
  useEffect(() => {
    if (dealt && session.current === "code" && viewing === null) {
      document.getElementById("code-stage-heading")?.focus({ preventScroll: true });
    }
  }, [dealt, session.current, viewing]);

  const restart = useCallback(() => {
    dispatch({ type: "reset", now: Date.now() });
    setViewing(null);
    setSolution({ status: "idle" });
    setSaveError(null);
    setEvalError(null);
    setDealt(true);
    setBannerDismissedAt(Date.now());
  }, []);

  // ── render ─────────────────────────────────────────────────────────────

  const displayed: StageKey | "done" = viewing ?? session.current;
  const selectStage = (stage: StageKey) => {
    setViewing(stage === session.current ? null : stage);
    const column = columnRef.current;
    if (column && column.getBoundingClientRect().top < 64) column.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    if (stage === "code") requestAnimationFrame(() => document.getElementById("code-stage-heading")?.focus({ preventScroll: true }));
  };
  const codeReached = session.current === "code" || session.current === "done";
  const schedule = latestSchedule(session);
  const sessionFlags = flaggedTags(session);
  const showBanner = hydrated && schedule?.scheduled && schedule.at > bannerDismissedAt && displayed !== "done";
  const progress = detail?.progress ?? null;
  const started = session.invariant.draft.length > 0 || session.current !== "invariant";

  return (
    <div className="xl:-mx-12 2xl:-mx-32">
      <nav aria-label="Breadcrumb" className="mb-3">
        <Link href="/practice" className="inline-flex items-center gap-1.5 rounded-lg text-sm text-fg-muted transition-colors hover:text-fg">
          <span aria-hidden="true">←</span> All problems
        </Link>
      </nav>

      <PageHeader
        className="sm:mb-6"
        eyebrow="Card-flip IDE"
        title={problem.title}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <DifficultyPill difficulty={problem.difficulty} />
            {problem.tags.map((tag) => (
              <TagPill key={tag} tag={tag} weak={weak.has(tag)} />
            ))}
            {progress?.card.due ? (
              <Pill tone="cyan" icon="⏰">
                Due for review
              </Pill>
            ) : progress?.solved ? (
              <Pill tone="success" icon="✓">
                Solved{progress.card.intervalLabel ? ` · next in ${progress.card.intervalLabel}` : ""}
              </Pill>
            ) : progress && progress.attempts > 0 ? (
              <Pill tone="violet">In progress</Pill>
            ) : null}
          </span>
        }
        actions={
          <>
            <a
              href={`https://leetcode.com/problems/${problem.leetcodeSlug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "outline", size: "sm" })}
            >
              LeetCode
              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current stroke-[1.6]">
                <path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {hydrated && started && !isDone ? (
              <ConfirmButton confirmLabel="Start over" confirmVariant="secondary" prompt="Restart at Stage 1?" onConfirm={restart} leftIcon={<span aria-hidden="true">↻</span>}>
                Start over
              </ConfirmButton>
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div
          role="region"
          aria-label="Problem statement"
          tabIndex={0}
          className="scrollbar-thin rounded-card lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
        >
          <ProblemStatement problem={problem} weak={weak} attempts={detail?.recentAttempts ?? null} now={now} />
        </div>

        <div ref={columnRef} className="min-w-0 scroll-mt-24 space-y-4">
          {!hydrated ? (
            <WorkspaceSkeleton />
          ) : (
            <>
              <StageStepper session={session} displayed={displayed} onSelect={selectStage} />

              {showBanner && schedule?.scheduled ? (
                <Banner
                  tone="synapse"
                  icon="📲"
                  onDismiss={() => setBannerDismissedAt(Date.now())}
                  title={drillMessage(sessionFlags, schedule.scheduled)}
                  action={
                    problem.weakTags[0] ? (
                      <ButtonLink href={`/review?tag=${sessionFlags[0]?.tag ?? problem.weakTags[0].tag}`} size="sm" variant="ghost">
                        Drill now
                      </ButtonLink>
                    ) : undefined
                  }
                >
                  {schedule.scheduled.titles.join(" · ")}
                </Banner>
              ) : null}

              {displayed === "invariant" || displayed === "edgeCase" ? (
                <div key={displayed} className="motion-safe:animate-fade-up">
                  <TextStageCard
                    stage={displayed}
                    prompt={problem.stages[displayed]}
                    state={session[displayed]}
                    readOnly={session[displayed].sync !== null}
                    evaluating={evaluating === displayed}
                    evalError={evalError?.stage === displayed ? evalError.message : null}
                    evalErrorRevealed={evalError?.stage === displayed && evalError.revealed}
                    saving={saving?.stage === displayed ? (saving.rating ?? null) : null}
                    saveError={saveError?.stage === displayed ? saveError.message : null}
                    getElapsed={elapsed}
                    onDraft={(text) => dispatch({ type: "draft", stage: displayed, text })}
                    onHint={() => dispatch({ type: "hint", stage: displayed })}
                    onEvaluate={(revealed) => void evaluate(displayed, revealed)}
                    onRate={(grade, rating) => void rate(displayed, grade, rating)}
                    onSkipSave={() => skipTextSave(displayed)}
                    autoFocus={dealt}
                  />
                </div>
              ) : null}

              {codeReached ? (
                <div hidden={displayed !== "code"} className={displayed === "code" ? "motion-safe:animate-fade-up" : undefined}>
                  <CodeStagePanel
                    problem={problem}
                    state={session.code}
                    practiceMode={session.code.completed}
                    saving={saving?.stage === "code"}
                    saveError={saveError?.stage === "code" ? saveError.message : null}
                    notes={{
                      invariant: session.invariant.result?.answerKey ?? null,
                      edgeCase: session.edgeCase.result?.answerKey ?? null,
                    }}
                    getElapsed={elapsed}
                    onLanguage={(language) => dispatch({ type: "language", language })}
                    onJudged={onJudged}
                    onGiveUp={() => void giveUp()}
                    onRetrySave={() => (saveError?.stage === "code" ? saveError.retry() : undefined)}
                    onSkipSave={saveError?.stage === "code" && saveError.skip ? saveError.skip : undefined}
                    onShowSummary={isDone ? () => setViewing(null) : undefined}
                  />
                </div>
              ) : null}

              {displayed === "done" ? (
                <CompletionPanel
                  problem={problem}
                  session={session}
                  nextProblem={nextProblem}
                  onRestart={restart}
                  onReview={selectStage}
                  onShowSolution={() => void loadSolution()}
                  solutionShown={solution.status !== "idle"}
                  autoFocus={dealt}
                />
              ) : null}

              {viewing !== null && displayed !== "code" ? (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setViewing(null)} rightIcon={<span aria-hidden="true">→</span>}>
                    {isDone ? "Back to summary" : `Back to Stage ${STAGE_META[session.current as StageKey].number}`}
                  </Button>
                </div>
              ) : null}

              {displayed === "done" || (displayed === "code" && session.code.completed) ? (
                <div ref={solutionRef} className="scroll-mt-24">
                  <SolutionPanel state={solution} initialLanguage={session.code.language} onRetry={() => void loadSolution()} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your session" className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[3.25rem] rounded-2xl" />
        ))}
      </div>
      <Card>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-7 w-2/3" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
        <div className="mt-4 flex justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </Card>
    </div>
  );
}
