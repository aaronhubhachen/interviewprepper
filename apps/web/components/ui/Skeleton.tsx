import { cn } from "@/lib/cn";

/** Loading placeholder block; size it with className (e.g. "h-6 w-40"). Pulse is motion-safe only. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-lg bg-ink-700/80 motion-safe:animate-pulse", className)} />;
}
