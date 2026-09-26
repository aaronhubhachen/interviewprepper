import { cn } from "@/lib/cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  /** Accessible label (visually hidden). Pass "" when a parent already announces the state. */
  label?: string;
  className?: string;
}

const SIZES = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-10 w-10 border-[3px]" } as const;

/** Indeterminate spinner; the ring stays static (still visible) under prefers-reduced-motion. */
export function Spinner({ size = "md", label = "Loading…", className }: SpinnerProps) {
  return (
    <span role={label ? "status" : undefined} className={cn("inline-flex items-center", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block rounded-full border-synapse/25 border-t-synapse motion-safe:animate-spin",
          SIZES[size],
        )}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
