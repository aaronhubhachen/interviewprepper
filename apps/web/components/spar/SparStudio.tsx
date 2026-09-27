"use client";

import type { BehavioralQuestion } from "@synapse/core/content";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, PageHeader, Pill } from "@/components/ui";
import { ApiError, errorMessage, evaluateSpar, fetchSparSessions } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { SparSessionSummary } from "@/lib/types";
import {
  comparisonFor,
  mergePracticeStats,
  mergeSessions,
  pickSurprise,
  practiceSummary,
  resultFromResponse,
  resultFromSession,
  sessionFromResult,
  type PracticeTotals,
  type SparResultView,
} from "@/lib/voice/sessions";
import { useSpeechSynthesis } from "@/lib/voice/useSpeechSynthesis";
import { useStoredBoolean } from "@/lib/voice/useStoredBoolean";
import { QuestionPicker } from "./QuestionPicker";
import { SessionHistory } from "./SessionHistory";
import { SparResults } from "./SparResults";
import { SparRoom, type RoomAnswer } from "./SparRoom";

type View =
  | { kind: "pick" }
  | {
      kind: "room";
      question: BehavioralQuestion;
      round: 1 | 2;
      /** Round 2: the EM's follow-up being answered. */
      followUpOf: string | null;
      /** Read the question aloud on entry (only after a user gesture; browsers block autoplay otherwise). */
      autoPlay: boolean;
      /** Distinguishes retries of the same question. */
      attempt: number;
    }
  | { kind: "results"; result: SparResultView; fresh: boolean };

export interface SparStudioProps {
  questions: BehavioralQuestion[];
  /** Server-preloaded history (null: fetch on the client). */
  initialSessions: SparSessionSummary[] | null;
  /** Per-question practice over every session (the history above is only the latest SESSION_LIMIT). */
  initialTotals?: PracticeTotals | null;
  /** ?q= deep link. */
  initialQuestionId?: string;
  /** Server render time, so relative times hydrate identically. */
  renderedAt: number;
}

const SESSION_LIMIT = 30;
const VOICE_PREF_KEY = "synapse.spar.voice";

function promptFor(view: Extract<View, { kind: "room" }>): string {
  return view.round === 2 && view.followUpOf ? view.followUpOf : view.question.prompt;
}

function syncUrl(questionId: string | null) {
  const url = questionId ? `/behavioral?q=${encodeURIComponent(questionId)}` : "/behavioral";
  if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
}

export function SparStudio({ questions, initialSessions, initialTotals = null, initialQuestionId, renderedAt }: SparStudioProps) {
  const tts = useSpeechSynthesis();
  const [voiceEnabled, setVoiceEnabled] = useStoredBoolean(VOICE_PREF_KEY, true);
  const [now, setNow] = useState(renderedAt);

  const [view, setView] = useState<View>(() => {
    const question = initialQuestionId ? questions.find((candidate) => candidate.id === initialQuestionId) : undefined;
    return question ? { kind: "room", question, round: 1, followUpOf: null, autoPlay: false, attempt: 0 } : { kind: "pick" };
  });

  const [sessions, setSessions] = useState<SparSessionSummary[]>(initialSessions ?? []);
  const [sessionsStatus, setSessionsStatus] = useState<"ready" | "loading" | "error">(initialSessions ? "ready" : "loading");
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastAnswerRef = useRef<RoomAnswer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const viewTopRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  // Page-load totals over every session, plus anything answered since: "New to you", best scores and
  // Surprise me must not forget questions that scrolled out of the SESSION_LIMIT history window.
  const stats = useMemo(() => mergePracticeStats(initialTotals, sessions), [initialTotals, sessions]);
  const summary = useMemo(() => practiceSummary(stats), [stats]);
  // Never read the question aloud into a live microphone (SparRoom reports recording / finishing).
  const roomBusyRef = useRef(false);
  const onRoomBusyChange = useCallback((busy: boolean) => {
    roomBusyRef.current = busy;
  }, []);

  // Relative times ("3 min ago") tick without a hydration mismatch.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const loadSessions = useCallback(async (signal?: AbortSignal) => {
    setSessionsStatus("loading");
    setSessionsError(null);
    try {
      const response = await fetchSparSessions(SESSION_LIMIT, { signal });
      setSessions((current) => response.sessions.reduce((merged, session) => mergeSessions(merged, session), current));
      setSessionsStatus("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "aborted") return;
      setSessionsError(errorMessage(error));
      setSessionsStatus("error");
    }
  }, []);

  useEffect(() => {
    if (initialSessions) return;
    const controller = new AbortController();
    void loadSessions(controller.signal);
    return () => controller.abort();
  }, [initialSessions, loadSessions]);

  // Cancel any in-flight evaluation when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Move focus to the new view's heading (skip the first render so page load keeps normal focus order).
  const viewKey =
    view.kind === "room" ? `room:${view.question.id}:${view.round}:${view.attempt}` : view.kind === "results" ? `results:${view.result.sessionId}` : "pick";
  // Compare with the previous key (not a "first render" flag) so StrictMode's double effect run on mount is a no-op.
  const shownViewKey = useRef(viewKey);
  useEffect(() => {
    if (shownViewKey.current === viewKey) return;
    shownViewKey.current = viewKey;
    // Bring the new view's top edge just under the sticky nav (only if we are scrolled past it), then focus its heading.
    const container = viewTopRef.current;
    const target = view.kind === "pick" || !container ? 0 : Math.max(0, container.getBoundingClientRect().top + window.scrollY - 80);
    if (window.scrollY > target) window.scrollTo({ top: target });
    headingRef.current?.focus({ preventScroll: true });
  }, [viewKey]);

  // The interviewer reads the question when you walk in (if voice is on).
  // Keyed on the room identity (not voiceEnabled): toggling voice mid-question should not re-read it.
  const { speak, supported: ttsSupported } = tts;
  useEffect(() => {
    if (view.kind !== "room" || !view.autoPlay || !voiceEnabled || !ttsSupported) return;
    const text = promptFor(view);
    const id = window.setTimeout(() => speak(text), 350);
    return () => window.clearTimeout(id);
  }, [viewKey, ttsSupported, speak]);

  const cancelEvaluation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setEvaluating(false);
  }, []);

  const go = useCallback(
    (next: View) => {
      cancelEvaluation();
      tts.cancel();
      setSubmitError(null);
      setView(next);
      syncUrl(next.kind === "room" ? next.question.id : next.kind === "results" ? next.result.questionId : null);
    },
    [cancelEvaluation, tts],
  );

  const enterRoom = useCallback(
    (question: BehavioralQuestion, round: 1 | 2 = 1, followUpOf: string | null = null) =>
      go({ kind: "room", question, round, followUpOf, autoPlay: true, attempt: Date.now() }),
    [go],
  );

  const surprise = useCallback(() => {
    const current = view.kind === "room" ? view.question.id : view.kind === "results" ? view.result.questionId : undefined;
    const question = pickSurprise(questions, stats, Math.random, current);
    if (question) enterRoom(question);
  }, [enterRoom, questions, stats, view]);

  const submit = useCallback(
    async (answer: RoomAnswer) => {
      if (view.kind !== "room") return;
      const { question, round, followUpOf } = view;
      lastAnswerRef.current = answer;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setEvaluating(true);
      setSubmitError(null);
      setAnnouncement("Answer sent. Waiting for feedback.");
      try {
        const response = await evaluateSpar(
          {
            questionId: question.id,
            transcript: answer.transcript,
            durationMs: answer.durationMs,
            round,
            followUpOf: round === 2 && followUpOf ? followUpOf : undefined,
          },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const result = resultFromResponse(response, question, answer, followUpOf);
        setSessions((current) => mergeSessions(current, sessionFromResult(result)));
        setView({ kind: "results", result, fresh: true });
        setAnnouncement(`Feedback ready. Overall score ${result.feedback.overall} out of 100.`);
      } catch (error) {
        if (controller.signal.aborted || (error instanceof ApiError && error.code === "aborted")) return;
        setSubmitError(errorMessage(error));
        setAnnouncement("Couldn't get feedback. Your answer is still there.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setEvaluating(false);
        }
      }
    },
    [view],
  );

  const retrySubmit = useCallback(() => {
    if (lastAnswerRef.current) void submit(lastAnswerRef.current);
  }, [submit]);

  const openSession = useCallback(
    (session: SparSessionSummary) => go({ kind: "results", result: resultFromSession(session, questions), fresh: false }),
    [go, questions],
  );

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next) tts.cancel();
    // Mid-take, only save the preference: speaking now would be transcribed into the answer.
    else if (view.kind === "room" && tts.supported && !roomBusyRef.current) tts.speak(promptFor(view));
  };

  // ── render ───────────────────────────────────────────────────────────

  const history = (
    <SessionHistory
      sessions={sessions}
      status={sessionsStatus}
      error={sessionsError}
      onRetry={() => void loadSessions()}
      onOpen={openSession}
      activeId={view.kind === "results" ? view.result.sessionId : null}
      totals={initialTotals ? summary : null}
      now={now}
    />
  );

  const questionFor = (id: string) => questions.find((question) => question.id === id);

  return (
    <>
      <PageHeader
        eyebrow="STAR practice"
        title="Behavioral"
        description="Answer out loud. Get STAR feedback and a follow-up."
        actions={
          <>
            <Pill tone="neutral" icon="🔒" size="md" title="Speech is transcribed by your browser. Only the text is sent.">
              Audio stays on your device
            </Pill>
            <button
              type="button"
              role="switch"
              aria-checked={voiceEnabled && tts.supported !== false}
              disabled={tts.supported === false}
              onClick={toggleVoice}
              title={tts.supported === false ? "This browser can't read text aloud" : undefined}
              className="inline-flex h-10 items-center gap-2.5 rounded-xl border border-line-strong bg-ink-800 px-3 text-sm font-medium text-fg transition-colors hover:border-synapse/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">{voiceEnabled ? "🔊" : "🔇"}</span>
              Interviewer voice
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  voiceEnabled && tts.supported !== false ? "bg-synapse-strong" : "bg-ink-600",
                )}
              >
                <span
                  className={cn(
                    "absolute h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                    voiceEnabled && tts.supported !== false ? "translate-x-[1.125rem]" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
          </>
        }
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div ref={viewTopRef}>
      {view.kind === "pick" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
          <QuestionPicker questions={questions} stats={stats} onPick={(question) => enterRoom(question)} onSurprise={surprise} headingRef={headingRef} />
          {history}
        </div>
      ) : (
        <>
          <nav aria-label="Behavioral" className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => go({ kind: "pick" })} leftIcon={<span aria-hidden="true">←</span>}>
              All questions
            </Button>
            <Button variant="ghost" size="sm" onClick={surprise} leftIcon={<span aria-hidden="true">🎲</span>}>
              Surprise me
            </Button>
          </nav>

          {view.kind === "room" ? (
            <SparRoom
              key={viewKey}
              question={view.question}
              round={view.round}
              prompt={promptFor(view)}
              tts={tts}
              evaluating={evaluating}
              submitError={submitError}
              onSubmit={(answer) => void submit(answer)}
              onRetrySubmit={retrySubmit}
              onDismissError={() => setSubmitError(null)}
              onCancelEvaluation={cancelEvaluation}
              onBusyChange={onRoomBusyChange}
              headingRef={headingRef}
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <SparResults
                key={viewKey}
                view={view.result}
                comparison={comparisonFor(view.result, sessions)}
                onAnswerFollowUp={
                  view.result.round === 1 && questionFor(view.result.questionId)
                    ? () => enterRoom(questionFor(view.result.questionId)!, 2, view.result.feedback.followUp)
                    : null
                }
                onRetry={questionFor(view.result.questionId) ? () => enterRoom(questionFor(view.result.questionId)!) : null}
                onNewQuestion={() => go({ kind: "pick" })}
                tts={tts}
                fresh={view.fresh}
                now={now}
                headingRef={headingRef}
              />
              <div className="xl:sticky xl:top-24 xl:self-start">{history}</div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}
