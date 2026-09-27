import { cn } from "@/lib/cn";

/** Prepr's mark: two stacked cards on an orange tile. Decorative by default; pass a title to expose it. */
export function PreprMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="9" fill="#f97316" />
      <rect x="11.5" y="7" width="13.5" height="10.5" rx="2.6" fill="#fff" fillOpacity="0.45" />
      <rect x="7" y="13.5" width="13.5" height="11.5" rx="2.6" fill="#fff" />
    </svg>
  );
}
