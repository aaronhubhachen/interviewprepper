"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Plain text for typeahead and the accessible name when `label` is not a string. */
  text?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

/**
 * Styled replacement for <select>: a button that opens a listbox. Keyboard: ↑/↓, Home/End,
 * Enter/Space to pick, Escape to close, and type a letter to jump.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
  buttonClassName,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SelectOption<T>>;
  /** Accessible name. */
  label: string;
  size?: "sm" | "md";
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const textOf = (option: SelectOption<T>) => option.text ?? (typeof option.label === "string" ? option.label : option.value);

  const move = (from: number, step: number) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + step * i + options.length * i) % options.length;
      if (!options[next]!.disabled) return next;
    }
    return from;
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => move(index, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => move(index, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(move(-1, 1));
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(move(options.length, -1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const letter = event.key.toLowerCase();
      const start = active + 1;
      for (let i = 0; i < options.length; i++) {
        const index = (start + i) % options.length;
        const option = options[index]!;
        if (!option.disabled && textOf(option).toLowerCase().startsWith(letter)) {
          setActive(index);
          break;
        }
      }
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-ink-900/80 text-left text-fg transition-colors hover:border-synapse/50 focus-visible:border-synapse/60 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm",
          open && "border-synapse/60",
          buttonClassName,
        )}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform", open && "rotate-180")}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="scrollbar-thin absolute left-0 z-50 mt-1.5 max-h-72 min-w-full overflow-y-auto rounded-xl border border-line-strong bg-ink-850 p-1 shadow-card motion-safe:animate-fade-up"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${id}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onPointerEnter={() => !option.disabled && setActive(index)}
                onClick={() => pick(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-lg px-2.5 py-1.5",
                  size === "sm" ? "text-xs" : "text-sm",
                  index === active && !option.disabled && "bg-ink-700",
                  isSelected ? "font-semibold text-fg" : "text-fg-muted",
                  option.disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className={cn("w-3 text-synapse", !isSelected && "invisible")}>
                    ✓
                  </span>
                  {option.label}
                </span>
                {option.hint ? <span className="text-xs font-normal text-fg-subtle">{option.hint}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
