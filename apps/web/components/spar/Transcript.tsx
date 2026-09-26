"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { segmentFillers, type TranscriptSegment } from "@/lib/voice/fillers";

const BOX = "h-56 sm:h-64 rounded-2xl border border-line bg-ink-900/70";
const TEXT = "p-4 text-[0.975rem] leading-relaxed";

function FillerMark({ children, filler }: { children: ReactNode; filler: string }) {
  return (
    <mark
      title={`Filler: “${filler}”`}
      className="rounded-md bg-warning/15 text-warning underline decoration-warning/60 decoration-dotted underline-offset-4 [box-decoration-break:clone]"
    >
      {children}
    </mark>
  );
}

/** Transcript text with filler words highlighted (colour + dotted underline, never colour alone). */
export function HighlightedText({ segments }: { segments: readonly TranscriptSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.filler ? (
          <FillerMark key={index} filler={segment.filler}>
            {segment.text}
          </FillerMark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

export interface LiveTranscriptProps {
  finalText: string;
  interimText: string;
  listening: boolean;
  placeholder: ReactNode;
  className?: string;
}

/** Fixed-height, auto-scrolling live transcript (sticks to the bottom unless the user scrolls up). */
export function LiveTranscript({ finalText, interimText, listening, placeholder, className }: LiveTranscriptProps) {
  const finalSegments = useMemo(() => segmentFillers(finalText), [finalText]);
  const interimSegments = useMemo(() => segmentFillers(interimText), [interimText]);
  const boxRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box && stickRef.current) box.scrollTop = box.scrollHeight;
  }, [finalText, interimText]);

  const empty = !finalText && !interimText;
  return (
    <div
      ref={boxRef}
      role="region"
      aria-label="Live transcript"
      // Scrollable regions must be keyboard-reachable.
      tabIndex={0}
      onScroll={(event) => {
        const box = event.currentTarget;
        stickRef.current = box.scrollHeight - box.scrollTop - box.clientHeight < 32;
      }}
      className={cn(BOX, TEXT, "scrollbar-thin overflow-y-auto", className)}
    >
      {empty ? (
        <p className="text-fg-subtle">{placeholder}</p>
      ) : (
        <p className="whitespace-pre-wrap break-words text-fg">
          <HighlightedText segments={finalSegments} />
          {interimText ? (
            <span className="text-fg-subtle">
              {finalText ? " " : ""}
              <HighlightedText segments={interimSegments} />
            </span>
          ) : null}
          {listening ? (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-[0.2em] bg-axon motion-safe:animate-pulse"
            />
          ) : null}
        </p>
      )}
    </div>
  );
}

export interface TypedAnswerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxLength: number;
  id?: string;
  describedBy?: string;
}

/**
 * Textarea with live filler highlighting: a mirrored backdrop (same box, font,
 * padding and scrollbar gutter) paints the marks behind transparent-background text.
 */
export function TypedAnswer({ value, onChange, onSubmit, disabled, maxLength, id, describedBy }: TypedAnswerProps) {
  const segments = useMemo(() => segmentFillers(value), [value]);
  const backdropRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const sync = () => {
    if (backdropRef.current && areaRef.current) backdropRef.current.scrollTop = areaRef.current.scrollTop;
  };
  useEffect(sync, [value]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={cn(
        BOX,
        "relative overflow-hidden focus-within:border-synapse/60 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-axon",
        disabled && "opacity-70",
      )}
    >
      <div
        ref={backdropRef}
        aria-hidden="true"
        // Same thin scrollbar gutter as the textarea so both wrap at the same width.
        className={cn(TEXT, "scrollbar-thin pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-transparent [scrollbar-gutter:stable]")}
      >
        {segments.map((segment, index) =>
          segment.filler ? (
            <mark key={index} className="rounded-sm bg-warning/25 text-transparent [box-decoration-break:clone]">
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
        {"\n "}
      </div>
      <textarea
        ref={areaRef}
        id={id}
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        onScroll={sync}
        onKeyDown={onKeyDown}
        disabled={disabled}
        maxLength={maxLength}
        spellCheck
        aria-describedby={describedBy}
        placeholder="Type your answer the way you would say it: situation, task, what you did, and the result."
        className={cn(
          TEXT,
          "scrollbar-thin relative block h-full w-full resize-none overflow-y-auto bg-transparent text-fg caret-axon placeholder:text-fg-subtle [scrollbar-gutter:stable] focus-visible:outline-none",
        )}
      />
    </div>
  );
}
