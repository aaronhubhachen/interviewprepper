"use client";

import { useEffect, useId, type ChangeEvent, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";

export const MAX_ANSWER_CHARS = 4000;
const MAX_TEXTAREA_PX = 168;

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onHint: () => void;
  onGiveUp: () => void;
  onSkip: () => void;
  /** Accepting input (phase "answering"). */
  enabled: boolean;
  /** Evaluation in flight. */
  busy: boolean;
  hintShown: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
}

/** iMessage-style composer: Enter sends, Shift+Enter adds a line; ❓ Hint, 🤷 I don't know, Skip. */
export function Composer({
  value,
  onChange,
  onSubmit,
  onHint,
  onGiveUp,
  onSkip,
  enabled,
  busy,
  hintShown,
  textareaRef,
  placeholder = "Type your answer…",
}: ComposerProps) {
  const helpId = useId();
  const counterId = useId();
  const trimmed = value.trim();
  const nearLimit = value.length > MAX_ANSWER_CHARS * 0.85;

  // Auto-grow up to ~6 lines, then scroll.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [value, textareaRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (enabled && trimmed) onSubmit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enabled && trimmed) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2" aria-label="Answer">
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor={`${helpId}-answer`}>
          Your answer
        </label>
        <textarea
          id={`${helpId}-answer`}
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={MAX_ANSWER_CHARS}
          disabled={!enabled}
          placeholder={busy ? "Synapse is grading your answer…" : placeholder}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby={`${helpId} ${nearLimit ? counterId : ""}`.trim()}
          enterKeyHint="send"
          autoComplete="off"
          spellCheck
          className={cn(
            "scrollbar-thin min-h-[3.25rem] flex-1 resize-none rounded-2xl border border-line-strong bg-ink-800 px-4 py-3.5 text-[0.95rem] leading-snug text-fg",
            "placeholder:text-fg-subtle focus:border-synapse/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-axon/70",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!enabled || !trimmed}
          loading={busy}
          loadingLabel="Grading your answer…"
          aria-label="Send answer"
          className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-2xl text-lg"
        >
          {busy ? null : <span aria-hidden="true">↑</span>}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onHint}
            disabled={!enabled || hintShown}
            leftIcon={<span aria-hidden="true">❓</span>}
            title={hintShown ? "Hint already shown" : "Show a nudge without the answer"}
          >
            Hint
          </Button>
          <Button variant="ghost" size="sm" onClick={onGiveUp} disabled={!enabled} leftIcon={<span aria-hidden="true">🤷</span>}>
            I don&apos;t know
          </Button>
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={!enabled} title="Skip for now (stays in your queue)">
            Skip
          </Button>
        </div>
        <p id={helpId} className="hidden items-center gap-1 text-xs text-fg-subtle sm:flex">
          <Kbd>Enter</Kbd> send <span aria-hidden="true">·</span> <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line
        </p>
        {nearLimit ? (
          <p id={counterId} className="w-full text-right text-xs text-warning tabular-nums sm:w-auto" aria-live="polite">
            {value.length}/{MAX_ANSWER_CHARS}
          </p>
        ) : null}
      </div>
    </form>
  );
}
