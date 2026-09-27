"use client";

import type { BehavioralQuestion } from "@synapse/core/content";
import { analyzeTranscript } from "@synapse/core/transcript";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Banner, Button, Card, Kbd } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatClock, plural } from "@/lib/format";
import { isWithinScope } from "@/lib/keyboard";
import {
  clampDurationMs,
  countWords,
  estimateSpokenMs,
  liveAnalysis,
  MAX_RECORDING_MS,
  MAX_TRANSCRIPT_CHARS,
  MIN_SUBMIT_WORDS,
  RAMBLE_MS,
  SHORT_ANSWER_WORDS,
  STAR_COPY,
  STAR_PARTS,
  TARGET_MS,
} from "@/lib/voice/metrics";
import { joinChunks } from "@/lib/voice/recognizer";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import type { SpeechSynthesisControls } from "@/lib/voice/useSpeechSynthesis";
import { EvaluatingOverlay } from "./EvaluatingOverlay";
import { InterviewerPanel } from "./InterviewerPanel";
import { LiveMetrics, type AnswerMode } from "./LiveMetrics";
import { LiveTranscript, TypedAnswer } from "./Transcript";

export interface RoomAnswer {
  transcript: string;
  durationMs: number;
  mode: AnswerMode;
}

export interface SparRoomProps {
  question: BehavioralQuestion;
  round: 1 | 2;
  /** What is being answered: the question, or the EM's follow-up in round 2. */
  prompt: string;
  tts: SpeechSynthesisControls;
  evaluating: boolean;
  submitError: string | null;
  onSubmit: (answer: RoomAnswer) => void;
  onRetrySubmit: () => void;
  onDismissError: () => void;
  onCancelEvaluation: () => void;
  /** Recording (or finishing a transcript) started / ended: the studio must not speak into a live mic. */
  onBusyChange?: (busy: boolean) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

interface Notice {
  tone: "info" | "warning";
  text: string;
}

function RecDot({ live }: { live?: boolean }) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-3 w-3">
      {live ? <span className="absolute inset-0 rounded-full bg-danger/60 motion-safe:animate-ping" /> : null}
      <span className={cn("relative inline-block h-3 w-3 rounded-full", live ? "bg-danger" : "bg-danger ring-2 ring-white/20")} />
    </span>
  );
}

function StopGlyph() {
  return <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px] bg-current" />;
}

/** Keeps a callback's latest version reachable from long-lived listeners. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function SparRoom({
  question,
  round,
  prompt,
  tts,
  evaluating,
  submitError,
  onSubmit,
  onRetrySubmit,
  onDismissError,
  onCancelEvaluation,
  onBusyChange,
  headingRef,
}: SparRoomProps) {
  const speech = useSpeechRecognition();
  const { snapshot } = speech;
  const [modeChoice, setModeChoice] = useState<AnswerMode | null>(null);
  const mode: AnswerMode = modeChoice ?? (speech.supported === false ? "typed" : "voice");
  const [typed, setTyped] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const startRef = useRef<number | null>(null);
  /** Record was pressed; the clock starts once the microphone is actually listening. */
  const armedRef = useRef(false);
  const stoppingRef = useRef(false);
  const milestoneRef = useRef(0);
  const mountedRef = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Keyboard focus was last inside the room (restored when a swapped-out button takes focus with it). */
  const focusInRoomRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const recording = snapshot.status === "starting" || snapshot.status === "listening";
  const busy = recording || snapshot.status === "stopping";

  const onBusyChangeRef = useLatest(onBusyChange);
  useEffect(() => {
    onBusyChangeRef.current?.(busy);
  }, [busy, onBusyChangeRef]);
  useEffect(() => () => onBusyChangeRef.current?.(false), [onBusyChangeRef]);

  // Anchor the clock to the moment the engine starts listening, not the click: the first-use mic permission
  // prompt and engine start-up are not speaking time (durationMs drives WPM, pace, the ring and auto-stop).
  useEffect(() => {
    if (snapshot.status === "listening" && armedRef.current) {
      armedRef.current = false;
      startRef.current = performance.now();
    } else if (snapshot.status === "idle") {
      armedRef.current = false;
    }
  }, [snapshot.status]);

  // Speaking clock: wall time from "listening" to Stop (0 while the microphone is starting).
  useEffect(() => {
    if (!recording) return;
    const tick = () => {
      if (startRef.current !== null) setElapsedMs(performance.now() - startRef.current);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [recording]);

  // The engine stopped by itself (error / permission): freeze the clock on the take.
  useEffect(() => {
    if (snapshot.status === "idle" && startRef.current !== null && !stoppingRef.current) {
      setElapsedMs(performance.now() - startRef.current);
      startRef.current = null;
    }
  }, [snapshot.status]);

  const voiceText = joinChunks([snapshot.finalText, snapshot.interimText]);
  const text = mode === "voice" ? voiceText : typed;
  const words = countWords(text);
  const durationMs = mode === "voice" ? elapsedMs : estimateSpokenMs(words);
  const durationKey = Math.floor(durationMs / 1000) * 1000;
  // Core analysis, with the live-checklist STAR guard (see liveAnalysis) for coaching and announcements.
  const analysis = useMemo(() => liveAnalysis(analyzeTranscript(text, durationKey)), [text, durationKey]);

  // ── actions ──────────────────────────────────────────────────────────

  const submitAnswer = useCallback(
    (transcript: string, duration: number, answerMode: AnswerMode) => {
      const trimmed = transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS);
      const count = countWords(trimmed);
      if (count < MIN_SUBMIT_WORDS) {
        setNotice({
          tone: "warning",
          text:
            count === 0
              ? answerMode === "voice"
                ? "We didn't catch anything. Check that the right microphone is selected, then try again or type your answer."
                : "Write your answer first."
              : `Only ${plural(count, "word")} so far. Give it a few sentences so there's something to coach.`,
        });
        return;
      }
      setNotice(null);
      onSubmit({ transcript: trimmed, durationMs: clampDurationMs(duration), mode: answerMode });
    },
    [onSubmit],
  );

  const startRecording = useCallback(() => {
    tts.cancel(); // never transcribe the interviewer's own voice
    onDismissError();
    setNotice(null);
    speech.reset();
    setElapsedMs(0);
    milestoneRef.current = 0;
    // The clock starts when the engine reports "listening" (see the anchor effect above).
    startRef.current = null;
    armedRef.current = true;
    speech.start();
    setAnnouncement("Recording. Answer out loud, then press Stop.");
  }, [onDismissError, speech, tts]);

  const stopRecording = useCallback(
    async (reason?: string) => {
      if (stoppingRef.current) return;
      stoppingRef.current = true;
      const started = startRef.current;
      const duration = started === null ? elapsedMs : performance.now() - started;
      startRef.current = null;
      armedRef.current = false;
      setElapsedMs(duration);
      setAnnouncement("Stopped. Finishing the transcript.");
      const transcript = await speech.stop();
      stoppingRef.current = false;
      if (!mountedRef.current) return;
      submitAnswer(transcript, duration, "voice");
      if (reason) setNotice({ tone: "info", text: reason });
    },
    [elapsedMs, speech, submitAnswer],
  );

  const discard = useCallback(() => {
    speech.abort();
    startRef.current = null;
    armedRef.current = false;
    setElapsedMs(0);
    setNotice(null);
    setAnnouncement("Recording discarded.");
  }, [speech]);

  const switchMode = useCallback(
    (next: AnswerMode) => {
      if (next === mode || busy || evaluating) return;
      if (next === "typed" && !typed.trim() && voiceText) setTyped(voiceText);
      setNotice(null);
      setModeChoice(next);
    },
    [busy, evaluating, mode, typed, voiceText],
  );

  // ── milestones, auto-stop, announcements ─────────────────────────────

  useEffect(() => {
    if (!recording) return;
    if (elapsedMs >= MAX_RECORDING_MS) {
      void stopRecording("Recording stopped automatically at 10 minutes.");
    } else if (elapsedMs >= RAMBLE_MS && milestoneRef.current < 2) {
      milestoneRef.current = 2;
      setAnnouncement("Two and a half minutes. Time to wrap up.");
    } else if (elapsedMs >= TARGET_MS && milestoneRef.current < 1) {
      milestoneRef.current = 1;
      setAnnouncement("Two minutes.");
    }
  }, [elapsedMs, recording, stopRecording]);

  const starKey = STAR_PARTS.map((part) => (analysis.star[part].present ? "1" : "0")).join("");
  const previousStar = useRef(starKey);
  useEffect(() => {
    const before = previousStar.current;
    previousStar.current = starKey;
    if (!(recording || mode === "typed")) return;
    const lit = STAR_PARTS.filter((_part, index) => starKey[index] === "1" && before[index] !== "1");
    if (lit.length) setAnnouncement(`${lit.map((part) => STAR_COPY[part].label).join(" and ")} detected.`);
  }, [starKey, recording, mode]);

  // "R" toggles recording (ignored while typing in a field). A bare-letter shortcut, so it only fires while
  // focus is inside the room (WCAG 2.1.4): a stray "r" elsewhere on the page never starts or submits a take.
  const toggleRef = useLatest(() => {
    if (recording) void stopRecording();
    else if (!busy) startRecording();
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "r" && event.key !== "R") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (!isWithinScope(rootRef.current, event.target)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) return;
      if (mode !== "voice" || !speech.supported || evaluating) return;
      event.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [evaluating, mode, speech.supported, toggleRef]);

  // Track whether focus is in the room: focus leaving it (Tab, or a click outside) clears the flag.
  useEffect(() => {
    const onOutside = (event: Event) => {
      if (!isWithinScope(rootRef.current, event.target)) focusInRoomRef.current = false;
    };
    document.addEventListener("focusin", onOutside);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, []);

  // Start → Stop → "Finishing…" swap the focused button out of the DOM, which drops focus to <body> and would
  // switch the scoped "R" shortcut off mid-take. Pull focus back to the room when that happens.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !focusInRoomRef.current) return;
    const active = document.activeElement;
    if (active === null || active === document.body) root.focus({ preventScroll: true });
  }, [snapshot.status, evaluating]);

  // ── render ───────────────────────────────────────────────────────────

  const hasTake = mode === "voice" && !busy && countWords(voiceText) > 0;
  const recognizerError = mode === "voice" ? snapshot.error : null;
  const liveNow = mode === "voice" ? recording : words > 0 && !evaluating;

  const placeholder: ReactNode =
    snapshot.status === "starting" ? (
      "Starting the microphone…"
    ) : recording ? (
      <>
        Listening… open with one sentence of context. <span className="text-fg-subtle">Filler words will be highlighted.</span>
      </>
    ) : speech.supported === null ? (
      "Checking microphone support…"
    ) : (
      <>
        Press <strong className="font-semibold text-fg-muted">Start answering</strong> and talk. Your words appear here as you
        speak, with filler words highlighted.
      </>
    );

  return (
    // tabIndex -1: a click anywhere in the room keeps focus inside it (the scope for the "R" shortcut).
    <div
      ref={rootRef}
      tabIndex={-1}
      onFocus={() => {
        focusInRoomRef.current = true;
      }}
      className="grid gap-6 outline-none lg:grid-cols-[minmax(0,1fr)_22.5rem]"
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="min-w-0 space-y-6">
        <InterviewerPanel
          question={question}
          round={round}
          prompt={prompt}
          speaking={tts.speaking}
          ttsSupported={tts.supported}
          onReplay={() => {
            if (!busy) tts.speak(prompt);
          }}
          onStopSpeaking={tts.cancel}
          replayDisabled={busy}
          headingRef={headingRef}
        />

        <Card aria-labelledby="answer-title" className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="answer-title" className="text-lg font-semibold text-fg">
                Your answer
              </h2>
              <p className="text-sm text-fg-muted">
                {round === 2 ? "Answer the follow-up in under a minute." : "Aim for about two minutes, STAR style."}
              </p>
            </div>
            <div role="group" aria-label="Answer mode" className="inline-flex rounded-xl border border-line bg-ink-900 p-1">
              {(
                [
                  { key: "voice", icon: "🎙️", label: "Speak", disabled: speech.supported === false },
                  { key: "typed", icon: "⌨️", label: "Type", disabled: false },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={mode === option.key}
                  disabled={option.disabled || busy || evaluating}
                  onClick={() => switchMode(option.key)}
                  title={option.disabled ? "Speech recognition is not available in this browser" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                    mode === option.key ? "bg-ink-700 text-fg shadow-card" : "text-fg-muted hover:text-fg",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "voice" ? (
            <LiveTranscript
              finalText={snapshot.finalText}
              interimText={snapshot.interimText}
              listening={snapshot.status === "listening"}
              placeholder={placeholder}
            />
          ) : (
            <TypedAnswer
              id="typed-answer"
              value={typed}
              onChange={setTyped}
              onSubmit={() => submitAnswer(typed, estimateSpokenMs(countWords(typed)), "typed")}
              disabled={evaluating}
              maxLength={MAX_TRANSCRIPT_CHARS}
              describedBy="typed-answer-meta"
            />
          )}

          <div className="space-y-3 empty:hidden [&:not(:empty)]:mt-4">
            {submitError ? (
              <Banner
                tone="danger"
                title="Couldn't get feedback"
                onDismiss={onDismissError}
                action={
                  <Button size="sm" variant="secondary" onClick={onRetrySubmit}>
                    Try again
                  </Button>
                }
              >
                {submitError} Your answer is still here.
              </Banner>
            ) : null}
            {recognizerError ? (
              <Banner
                tone={recognizerError.kind === "denied" ? "danger" : "warning"}
                title={recognizerError.kind === "denied" ? "Microphone blocked" : "Voice capture stopped"}
                action={
                  <>
                    <Button size="sm" variant="secondary" onClick={() => switchMode("typed")}>
                      Type instead
                    </Button>
                    <Button size="sm" variant="ghost" onClick={startRecording}>
                      Retry
                    </Button>
                  </>
                }
              >
                {recognizerError.message}
              </Banner>
            ) : null}
            {speech.supported === false ? (
              <Banner tone="info" title="Voice capture isn't available in this browser">
                Chrome, Edge and Safari support speech recognition. Typing gives you the same live metrics and feedback.
              </Banner>
            ) : null}
            {notice ? (
              <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
                {notice.text}
              </Banner>
            ) : null}
          </div>

          <div className="mt-4 flex min-h-12 flex-wrap items-center gap-3">
            {mode === "voice" ? (
              snapshot.status === "stopping" ? (
                <Button size="lg" loading loadingLabel="Finishing transcript">
                  Finishing transcript…
                </Button>
              ) : recording ? (
                <>
                  <Button size="lg" variant="danger" onClick={() => void stopRecording()} leftIcon={<StopGlyph />} aria-keyshortcuts="R">
                    Stop &amp; get feedback <span className="ml-1 hidden sm:inline-flex"><Kbd>R</Kbd></span>
                  </Button>
                  <Button variant="ghost" onClick={discard}>
                    Discard
                  </Button>
                  <span className="ml-auto inline-flex items-center gap-2 text-sm text-fg-muted" aria-hidden="true">
                    <RecDot live />
                    <span className="tabular-nums text-fg">{formatClock(elapsedMs)}</span>
                    <span className="hidden sm:inline">{snapshot.hearing ? "Hearing you" : "Listening"}</span>
                  </span>
                </>
              ) : hasTake ? (
                <>
                  <Button size="lg" onClick={() => submitAnswer(voiceText, elapsedMs, "voice")} disabled={evaluating}>
                    Get feedback
                  </Button>
                  <Button variant="secondary" onClick={startRecording} leftIcon={<RecDot />} disabled={evaluating}>
                    Re-record
                  </Button>
                  <Button variant="ghost" onClick={() => switchMode("typed")} disabled={evaluating}>
                    Edit as text
                  </Button>
                  <span className="ml-auto text-sm tabular-nums text-fg-subtle">
                    {plural(words, "word")} · {formatClock(elapsedMs)}
                  </span>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={startRecording}
                    disabled={!speech.supported || evaluating}
                    leftIcon={<RecDot />}
                    aria-keyshortcuts="R"
                  >
                    Start answering <span className="ml-1 hidden sm:inline-flex"><Kbd>R</Kbd></span>
                  </Button>
                  <span className="text-sm text-fg-subtle">
                    {tts.speaking ? "Recording will stop the question audio." : "Take a breath first. There's no rush."}
                  </span>
                </>
              )
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => submitAnswer(typed, estimateSpokenMs(words), "typed")}
                  disabled={words < MIN_SUBMIT_WORDS || evaluating}
                >
                  Get feedback
                </Button>
                <span className="hidden text-sm text-fg-subtle sm:inline">
                  <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd>
                </span>
                <span id="typed-answer-meta" className="ml-auto text-sm tabular-nums text-fg-subtle">
                  {plural(words, "word")} · ≈ {formatClock(estimateSpokenMs(words))} spoken
                </span>
              </>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-xs text-fg-subtle">
            <span aria-hidden="true">🔒</span>
            <span>
              Prepr never records or uploads audio. {mode === "voice" ? "Your browser transcribes your speech, and only " : "Only "}
              the text is sent for feedback.
              {words > 0 && words < SHORT_ANSWER_WORDS ? " Short answers get lighter feedback." : ""}
            </span>
          </p>

          {evaluating ? <EvaluatingOverlay onCancel={onCancelEvaluation} /> : null}
        </Card>
      </div>

      <LiveMetrics
        analysis={analysis}
        elapsedMs={durationMs}
        mode={mode}
        live={liveNow}
        dimmed={evaluating}
        className="lg:sticky lg:top-24 lg:self-start"
      />
    </div>
  );
}
