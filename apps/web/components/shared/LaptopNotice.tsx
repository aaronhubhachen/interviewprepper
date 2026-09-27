/** Shown below the md breakpoint on pages built for a keyboard and a large screen. */
export function LaptopNotice({ what = "This round" }: { what?: string }) {
  return (
    <p className="mb-4 rounded-xl border border-line-strong bg-ink-850 px-4 py-3 text-sm text-fg-muted md:hidden">
      <span aria-hidden="true">💻 </span>
      {what} works best on a laptop.
    </p>
  );
}
