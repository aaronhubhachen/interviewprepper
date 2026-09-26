import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Keyboard key hint, e.g. <Kbd>1</Kbd> or <Kbd>⌘ Enter</Kbd>. */
export function Kbd({ className, children, ...rest }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong border-b-2 bg-ink-800 px-1.5",
        "font-mono text-[0.7rem] font-medium leading-none text-fg-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
