"use client";

import { cn } from "@/lib/cn";
import { RATING_META } from "./bits";
import { STAGE_META, STAGE_ORDER, stageStatus, type PracticeSession, type StageKey } from "./session";

function resultGlyph(session: PracticeSession, stage: StageKey): string | null {
  if (stage === "code") {
    if (!session.code.completed) return null;
    return session.code.gaveUp ? "📖" : "✅";
  }
  const state = session[stage];
  if (!state.sync) return null;
  if (state.revealed) return "📖";
  return state.rating ? RATING_META[state.rating].emoji : "✓";
}

/**
 * Stage 1 → 2 → 3 progress. Completed stages are buttons that open a
 * read-only view of that card; upcoming stages are locked.
 */
export function StageStepper({
  session,
  displayed,
  onSelect,
}: {
  session: PracticeSession;
  /** The stage whose card is on screen ("done" = summary). */
  displayed: StageKey | "done";
  onSelect: (stage: StageKey) => void;
}) {
  return (
    <nav aria-label="Problem stages">
      <ol className="grid grid-cols-3 gap-2">
        {STAGE_ORDER.map((stage, index) => {
          const meta = STAGE_META[stage];
          const status = stageStatus(session, stage);
          const glyph = resultGlyph(session, stage);
          const isShown = displayed === stage;
          const locked = status === "upcoming";
          return (
            <li key={stage} className="relative">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-2 top-1/2 h-px w-2",
                    status === "upcoming" ? "bg-line" : "bg-synapse/60",
                  )}
                />
              ) : null}
              <button
                type="button"
                disabled={locked}
                onClick={() => onSelect(stage)}
                aria-current={isShown ? "step" : undefined}
                aria-label={`Stage ${meta.number}: ${meta.title}, ${status === "done" ? "completed" : status === "current" ? "in progress" : "locked"}${isShown ? ", showing" : ""}`}
                className={cn(
                  "group flex w-full flex-col items-center gap-1.5 rounded-2xl border px-2 py-2 text-center transition-[border-color,background-color,box-shadow] sm:flex-row sm:gap-2.5 sm:px-3 sm:text-left",
                  isShown
                    ? "border-synapse/60 bg-synapse/10 shadow-glow"
                    : status === "done"
                      ? "border-line bg-ink-850/80 hover:border-synapse/40"
                      : status === "current"
                        ? "border-line-strong bg-ink-850/80 hover:border-synapse/40"
                        : "border-line/60 bg-ink-900/40 opacity-70",
                  locked && "cursor-not-allowed",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    status === "done"
                      ? "bg-success/15 text-success"
                      : status === "current"
                        ? "bg-[linear-gradient(135deg,var(--color-synapse-strong),var(--color-axon-strong))] text-white"
                        : "border border-line-strong text-fg-subtle",
                  )}
                >
                  {glyph ?? (locked ? "🔒" : meta.number)}
                </span>
                <span className="min-w-0 max-w-full">
                  <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fg-subtle sm:block">Stage {meta.number}</span>
                  <span className={cn("block truncate text-xs font-medium sm:text-sm", locked ? "text-fg-subtle" : "text-fg")}>{meta.short}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
