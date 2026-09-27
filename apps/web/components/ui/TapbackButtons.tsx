"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { IntervalPreview, Rating } from "@synapse/core/sm2";
import type { TextGrade } from "@synapse/core/tapback";
import { cn } from "@/lib/cn";
import { isWithinScope } from "@/lib/keyboard";
import { Kbd } from "./Kbd";
import { Spinner } from "./Spinner";

export interface TapbackOption {
  rating: Rating;
  emoji: string;
  label: string;
  description: string;
  grade: TextGrade;
  /** Keyboard shortcut; matches the iMessage text replies ("3" = effortless, "1" = blank). */
  key: "1" | "2" | "3";
}

/** Display order mirrors the iMessage legend: ❤️ → 4d · 👍 → 1d · 👎 → 10m. */
export const TAPBACK_OPTIONS: readonly TapbackOption[] = [
  { rating: "love", emoji: "❤️", label: "Effortless", description: "Instant, confident recall", grade: 5, key: "3" },
  { rating: "like", emoji: "👍", label: "Hesitant", description: "Got it, with some effort", grade: 3, key: "2" },
  { rating: "dislike", emoji: "👎", label: "Guessed", description: "Guessed or blanked", grade: 1, key: "1" },
];

const TONES: Record<Rating, { idle: string; active: string; ring: string }> = {
  love: {
    idle: "hover:border-love/60 hover:bg-love/10",
    active: "border-love/70 bg-love/15",
    ring: "shadow-[0_0_0_1px_rgb(249_115_22/0.5),0_10px_30px_-12px_rgb(249_115_22/0.6)]",
  },
  like: {
    idle: "hover:border-like/60 hover:bg-like/10",
    active: "border-like/70 bg-like/15",
    ring: "shadow-[0_0_0_1px_rgb(255_189_138/0.5),0_10px_30px_-12px_rgb(255_189_138/0.5)]",
  },
  dislike: {
    idle: "hover:border-dislike/60 hover:bg-dislike/10",
    active: "border-dislike/70 bg-dislike/15",
    ring: "shadow-[0_0_0_1px_rgb(160_160_160/0.5),0_10px_30px_-12px_rgb(160_160_160/0.5)]",
  },
};

export interface TapbackButtonsProps {
  /** Projected next interval per rating (from the API's `preview`), shown as "→ 4d". */
  preview?: Partial<Record<Rating, Pick<IntervalPreview, "label">>> | null;
  /** Called with the SM-2 grade (5 / 3 / 1) and the rating. */
  onRate: (grade: TextGrade, rating: Rating) => void;
  disabled?: boolean;
  /** true disables all; a Rating shows a spinner on that button (request in flight). */
  loading?: boolean | Rating;
  /** Highlights the grader's suggestion (e.g. from evaluation.suggestedGrade). */
  suggested?: Rating;
  /** Marks the rating the user picked (after submitting). */
  selected?: Rating;
  /**
   * 3 / 2 / 1 shortcuts (ignored while typing in inputs). Default true. They only fire while focus is
   * inside `keyboardScope` (WCAG 2.1.4), so a stray key elsewhere on the page never records a grade.
   */
  keyboard?: boolean;
  /** Element that must contain focus for the shortcuts (e.g. the card around the buttons). Default: the button group. */
  keyboardScope?: RefObject<HTMLElement | null>;
  size?: "md" | "lg";
  /** Accessible group label. */
  label?: string;
  className?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** ❤️ Effortless / 👍 Hesitant / 👎 Guessed with projected-interval sublabels and 3/2/1 shortcuts. */
export function TapbackButtons({
  preview,
  onRate,
  disabled = false,
  loading = false,
  suggested,
  selected,
  keyboard = true,
  keyboardScope,
  size = "md",
  label = "How confident was your recall?",
  className,
}: TapbackButtonsProps) {
  const inactive = disabled || loading !== false;
  const onRateRef = useRef(onRate);
  const groupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    onRateRef.current = onRate;
  }, [onRate]);

  useEffect(() => {
    if (!keyboard || inactive) return;
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      if (!isWithinScope(keyboardScope?.current ?? groupRef.current, event.target)) return;
      const option = TAPBACK_OPTIONS.find((candidate) => candidate.key === event.key);
      if (!option) return;
      event.preventDefault();
      onRateRef.current(option.grade, option.rating);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyboard, inactive, keyboardScope]);

  return (
    <div ref={groupRef} role="group" aria-label={label} className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      {TAPBACK_OPTIONS.map((option) => {
        const tone = TONES[option.rating];
        const isLoading = loading === option.rating;
        const isSelected = selected === option.rating;
        const isSuggested = !selected && suggested === option.rating;
        const next = preview?.[option.rating]?.label;
        return (
          <button
            key={option.rating}
            type="button"
            disabled={inactive}
            aria-pressed={selected ? isSelected : undefined}
            aria-busy={isLoading || undefined}
            aria-keyshortcuts={keyboard ? option.key : undefined}
            aria-label={`${option.label}${next ? `, next review in ${next}` : ""}${isSuggested ? " (suggested)" : ""}`}
            title={option.description}
            onClick={() => onRate(option.grade, option.rating)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-1 rounded-2xl border border-line-strong bg-ink-800 text-center",
              "transition-[background-color,border-color,box-shadow,transform] duration-150 motion-safe:active:scale-[0.98]",
              "disabled:cursor-not-allowed disabled:opacity-60",
              size === "lg" ? "min-h-28 px-3 py-4" : "min-h-22 px-2 py-3",
              !inactive && tone.idle,
              (isSelected || isSuggested) && tone.active,
              isSuggested && tone.ring,
              isSelected && tone.ring,
            )}
          >
            {isSuggested ? (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border border-line-strong bg-ink-900 px-2 py-px text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                Suggested
              </span>
            ) : null}
            <span aria-hidden="true" className={cn("leading-none", size === "lg" ? "text-3xl" : "text-2xl")}>
              {isLoading ? <Spinner size="md" label="" /> : option.emoji}
            </span>
            <span className="text-sm font-semibold text-fg">{option.label}</span>
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              {next ? <span className="tabular-nums">→ {next}</span> : null}
              {keyboard ? <Kbd className="hidden sm:inline-flex">{option.key}</Kbd> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
