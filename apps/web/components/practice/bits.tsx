"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { ProblemDifficulty } from "@synapse/core/content";
import type { Verdict } from "@synapse/core/grading";
import type { Rating } from "@synapse/core/sm2";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { STAGE_META, STAGE_ORDER, type StageKey } from "./session";

const DIFFICULTY: Record<ProblemDifficulty, { label: string; tone: PillTone }> = {
  easy: { label: "Easy", tone: "success" },
  medium: { label: "Medium", tone: "warning" },
  hard: { label: "Hard", tone: "danger" },
};

export function DifficultyPill({ difficulty, size = "sm" }: { difficulty: ProblemDifficulty; size?: "sm" | "md" }) {
  const meta = DIFFICULTY[difficulty];
  return (
    <Pill tone={meta.tone} size={size}>
      {meta.label}
    </Pill>
  );
}

export const RATING_META: Readonly<Record<Rating, { emoji: string; label: string }>> = {
  love: { emoji: "❤️", label: "Effortless" },
  like: { emoji: "👍", label: "Hesitant" },
  dislike: { emoji: "👎", label: "Guessed" },
};

export const VERDICT_META: Readonly<Record<Verdict, { emoji: string; headline: string; label: string; tone: PillTone }>> = {
  correct: { emoji: "✅", headline: "Nailed it", label: "Correct", tone: "success" },
  partial: { emoji: "🟡", headline: "Partially there", label: "Partial", tone: "warning" },
  incorrect: { emoji: "❌", headline: "Not quite", label: "Missed", tone: "danger" },
};

/** Three dots (invariant / edge case / code) filled for stages passed at least once. */
export function StageDots({ passed, className }: { passed: readonly StageKey[]; className?: string }) {
  const label = `${passed.length} of 3 stages passed`;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={label} title={label}>
      {STAGE_ORDER.map((stage) => (
        <span
          key={stage}
          className={cn(
            "h-1.5 w-5 rounded-full",
            passed.includes(stage) ? "bg-[linear-gradient(90deg,var(--color-synapse),var(--color-axon))]" : "bg-ink-600",
          )}
        />
      ))}
    </span>
  );
}

/** Live mm:ss of active (tab-visible) time on the current stage. Re-renders only itself. */
export function StageTimer({ getElapsed, running = true, className }: { getElapsed: () => number; running?: boolean; className?: string }) {
  const [ms, setMs] = useState(() => getElapsed());
  useEffect(() => {
    setMs(getElapsed());
    if (!running) return;
    const timer = window.setInterval(() => setMs(getElapsed()), 1000);
    return () => window.clearInterval(timer);
  }, [getElapsed, running]);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-900/70 px-2.5 py-1 font-mono text-xs tabular-nums text-fg-muted", className)}
      aria-label={`Time on this stage: ${formatClock(ms)}`}
      title="Active time on this stage (pauses when the tab is hidden)"
    >
      <span aria-hidden="true">⏱</span>
      <span aria-hidden="true">{formatClock(ms)}</span>
    </span>
  );
}

/** A button that asks for inline confirmation before running a destructive action. */
export function ConfirmButton({
  children,
  confirmLabel,
  prompt,
  onConfirm,
  variant = "ghost",
  confirmVariant = "danger",
  size = "sm",
  disabled,
  leftIcon,
  className,
}: {
  children: ReactNode;
  confirmLabel: string;
  prompt?: ReactNode;
  onConfirm: () => void;
  variant?: ButtonProps["variant"];
  confirmVariant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  leftIcon?: ReactNode;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
    else if (wasAsking.current) triggerRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  if (!asking) {
    return (
      <Button ref={triggerRef} variant={variant} size={size} disabled={disabled} leftIcon={leftIcon} className={className} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }
  return (
    <span
      role="group"
      aria-label="Confirm"
      className={cn("inline-flex flex-wrap items-center gap-2", className)}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") setAsking(false);
      }}
    >
      {prompt ? <span className="text-sm text-fg-muted">{prompt}</span> : null}
      <Button
        ref={confirmRef}
        variant={confirmVariant}
        size={size}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </span>
  );
}

/** Accessible segmented radio group (arrow keys move the selection). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "sm",
  className,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode; title?: string }>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const move = (index: number) => {
    const next = options[(index + options.length) % options.length]!;
    onChange(next.value);
    refs.current[(index + options.length) % options.length]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} id={id} className={cn("inline-flex rounded-xl border border-line-strong bg-ink-900/80 p-0.5", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={option.title}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index + 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index - 1);
              }
            }}
            className={cn(
              "rounded-[0.6rem] font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              selected ? "bg-ink-600 text-fg shadow-[0_0_0_1px_rgb(167_139_250/0.35)]" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function stageLabel(stage: StageKey): string {
  const meta = STAGE_META[stage];
  return `Stage ${meta.number} · ${meta.title}`;
}
