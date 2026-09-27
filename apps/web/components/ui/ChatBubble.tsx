import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChatSender = "agent" | "you";

export interface ChatBubbleProps {
  from: ChatSender;
  children?: ReactNode;
  /** Small line under the bubble: timestamp, "Delivered", verdict, etc. */
  meta?: ReactNode;
  /** Tapback emoji shown as a reaction badge on the bubble corner (e.g. "❤️"). */
  tapback?: string;
  /** Show the animated "…" typing indicator instead of children. */
  typing?: boolean;
  /** Draw the iMessage tail (default true; set false for consecutive bubbles). */
  tail?: boolean;
  /** Sender name above the first bubble in a group (e.g. "Prepr"). */
  name?: ReactNode;
  className?: string;
}

/** iMessage-style bubble: agent on the left (graphite), you on the right (blue). Plain text only. */
export function ChatBubble({ from, children, meta, tapback, typing, tail = true, name, className }: ChatBubbleProps) {
  const mine = from === "you";
  return (
    <div className={cn("flex w-full flex-col motion-safe:animate-fade-up", mine ? "items-end" : "items-start", className)}>
      {name ? <span className="mb-1 px-3 text-xs font-medium text-fg-subtle">{name}</span> : null}
      <div className="relative max-w-[85%] sm:max-w-[75%]">
        {tapback ? (
          <span
            aria-label={`Reacted ${tapback}`}
            role="img"
            className={cn(
              "absolute -top-4 z-10 grid h-8 min-w-8 place-items-center rounded-full border-2 border-ink-950 px-1 text-sm shadow-card",
              mine ? "-left-3 bg-ink-700" : "-right-3 bg-bubble-you",
            )}
          >
            {tapback}
          </span>
        ) : null}
        <div
          className={cn(
            "relative whitespace-pre-wrap break-words rounded-bubble px-4 py-2.5 text-[0.95rem] leading-relaxed",
            mine ? "bg-bubble-you text-white" : "border border-line bg-bubble-agent text-fg",
            tail && (mine ? "rounded-br-md" : "rounded-bl-md"),
          )}
        >
          {typing ? <TypingDots /> : children}
        </div>
      </div>
      {meta ? <div className="mt-1 px-2 text-xs text-fg-subtle">{meta}</div> : null}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex h-5 items-center gap-1" role="status">
      <span className="sr-only">Prepr is typing…</span>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-fg-muted motion-safe:animate-typing"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export interface ChatThreadProps extends ComponentProps<"div"> {
  /** Accessible name for the conversation log. */
  label?: string;
}

/** Scrollable conversation container; announces new bubbles politely to screen readers. */
export function ChatThread({ label = "Conversation", className, children, ...rest }: ChatThreadProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label={label}
      className={cn("scrollbar-thin flex flex-col gap-3 overflow-y-auto pt-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
