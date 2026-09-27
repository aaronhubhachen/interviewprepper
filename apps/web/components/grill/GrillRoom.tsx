"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Banner, Button, Card, ChatBubble, ChatThread, Kbd, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { GrillNextResponse, GrillTurn } from "@/lib/types";
import { recognizerErrorMessage } from "@/lib/voice/recognizer";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";

const MAX_ANSWER_CHARS = 6_000;
const MIN_ANSWER_CHARS = 2;

export interface GrillRoomProps {
  asked: GrillNextResponse[];
  turns: GrillTurn[];
  total: number;
  /** Waiting for the next question or the report. */
  thinking: "question" | "report" | null;
  error: string | null;
  voiceEnabled: boolean;
  voiceSupported: boolean | null;
  onToggleVoice: () => void;
  onAnswer: (answer: string) => void;
  onRetry: () => void;
  onEnd: () => void;
}

function joinText(base: string, addition: string): string {
  const extra = addition.trim();
  if (!extra) return base;
  return base.trim() ? `${base.trimEnd()} ${extra}` : extra;
}

export function GrillRoom({
  asked,
  turns,
  total,
  thinking,
  error,
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
  onAnswer,
  onRetry,
  onEnd,
}: GrillRoomProps) {
  const speech = useSpeechRecognition();
  const { snapshot } = speech;
  const [draft, setDraft] = useState("");
  const baseRef = useRef("");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const listening = snapshot.status === "starting" || snapshot.status === "listening" || snapshot.status === "stopping";
  const awaitingAnswer = asked.length > turns.length && !thinking;
  const live = listening ? joinText(baseRef.current, joinText(snapshot.finalText, snapshot.interimText)) : draft;

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [asked.length, turns.length, thinking]);

  useEffect(() => {
    if (awaitingAnswer) inputRef.current?.focus({ preventScroll: true });
  }, [awaitingAnswer]);

  const toggleMic = async () => {
    if (listening) {
      const heard = await speech.stop();
      setDraft(joinText(baseRef.current, heard));
      return;
    }
    baseRef.current = draft;
    speech.reset();
    speech.start();
  };

  const submit = async () => {
    let answer = draft;
    if (listening) answer = joinText(baseRef.current, await speech.stop());
    answer = answer.trim().slice(0, MAX_ANSWER_CHARS);
    if (answer.length < MIN_ANSWER_CHARS || !awaitingAnswer) return;
    setDraft("");
    speech.reset();
    onAnswer(answer);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  const answered = turns.length;

  return (
    <Card padded={false} className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            Question {Math.min(asked.length, total)} of {total}
          </p>
          <ProgressBar value={answered} max={total} label="Grill progress" valueText={`${answered} of ${total} answered`} size="xs" className="mt-1.5 max-w-xs" />
        </div>
        <div className="flex items-center gap-2">
          {voiceSupported ? (
            <Button size="sm" variant="ghost" onClick={onToggleVoice} aria-pressed={voiceEnabled}>
              {voiceEnabled ? "Voice on" : "Voice off"}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={onEnd} disabled={answered === 0 || thinking !== null}>
            End &amp; get verdict
          </Button>
        </div>
      </div>

      <ChatThread ref={threadRef} label="Resume grill" className="h-[min(28rem,55dvh)] px-4 pb-4 sm:px-6">
        {asked.map((question, index) => (
          <div key={index} className="flex flex-col gap-3">
            <ChatBubble from="agent" name={index === 0 ? "Interviewer" : undefined} meta={<TargetLine target={question.target} />}>
              {question.reaction ? <span className="mb-1 block text-fg-muted">{question.reaction}</span> : null}
              {question.question}
            </ChatBubble>
            {turns[index] ? <ChatBubble from="you">{turns[index].answer}</ChatBubble> : null}
          </div>
        ))}
        {thinking === "question" ? <ChatBubble from="agent" typing /> : null}
      </ChatThread>

      <div className="border-t border-line p-4 sm:px-6">
        {error ? (
          <Banner
            tone="danger"
            title="The interviewer lost the thread"
            action={
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            }
            className="mb-3"
          >
            {error}
          </Banner>
        ) : null}
        {snapshot.error ? (
          <p className="mb-2 text-sm text-warning" role="status">
            {recognizerErrorMessage(snapshot.error.kind)}
          </p>
        ) : null}
        <label htmlFor="grill-answer" className="sr-only">
          Your answer
        </label>
        <textarea
          id="grill-answer"
          ref={inputRef}
          value={live}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          readOnly={listening}
          disabled={!awaitingAnswer && !listening}
          maxLength={MAX_ANSWER_CHARS}
          rows={4}
          placeholder={thinking === "report" ? "The panel is deliberating…" : awaitingAnswer ? "Defend your resume. Be specific." : "Waiting for the interviewer…"}
          className={cn(
            "scrollbar-thin w-full resize-none rounded-xl border bg-ink-900 px-4 py-3 text-[0.95rem] leading-relaxed text-fg placeholder:text-fg-faint focus:outline-none disabled:opacity-60",
            listening ? "border-synapse" : "border-line focus:border-synapse",
          )}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="hidden text-xs text-fg-subtle sm:inline">
            <Kbd>⌘</Kbd> <Kbd>Enter</Kbd> to send
          </span>
          <div className="ml-auto flex items-center gap-2">
            {speech.supported ? (
              <Button variant={listening ? "danger" : "secondary"} onClick={() => void toggleMic()} disabled={!awaitingAnswer} aria-pressed={listening}>
                {listening ? "Stop dictating" : "Dictate"}
              </Button>
            ) : null}
            <Button
              onClick={() => void submit()}
              disabled={!awaitingAnswer || live.trim().length < MIN_ANSWER_CHARS}
              loading={thinking !== null}
              loadingLabel={thinking === "report" ? "Scoring…" : "Thinking…"}
            >
              {answered + 1 >= total ? "Final answer" : "Answer"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TargetLine({ target }: { target: string }) {
  return (
    <span className="line-clamp-1 max-w-[36ch] sm:max-w-[60ch]" title={target}>
      On: {target}
    </span>
  );
}
