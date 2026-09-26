import type { Tag } from "@synapse/core/content";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import type { ClientProblem, IdeAttemptSummary } from "@/lib/types";
import { InlineMarkdown, Markdown } from "./Markdown";
import { STAGE_META } from "./session";

function SectionTitle({ children, id }: { children: string; id?: string }) {
  return (
    <h2 id={id} className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
      {children}
    </h2>
  );
}

export function ProblemStatement({
  problem,
  weak,
  attempts,
  now,
  className,
}: {
  problem: ClientProblem;
  /** The user's current weak tags (highlights the struggle-sync note). */
  weak: ReadonlySet<Tag>;
  attempts: readonly IdeAttemptSummary[] | null;
  now: number | null;
  className?: string;
}) {
  const weakAlready = problem.weakTags.filter((ref) => weak.has(ref.tag));
  return (
    <Card as="div" padded={false} className={cn("overflow-hidden", className)}>
      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <SectionTitle>Problem</SectionTitle>
          <Markdown source={problem.statement} className="mt-2" />
        </div>

        {problem.examples.length > 0 ? (
          <div>
            <SectionTitle>Examples</SectionTitle>
            <ol className="mt-2 space-y-3">
              {problem.examples.map((example, index) => (
                <li key={index} className="rounded-2xl border border-line bg-ink-900/70 p-3.5">
                  <p className="text-xs font-semibold text-fg-muted">Example {index + 1}</p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-mono text-[0.8125rem] leading-5">
                    <dt className="text-fg-subtle">Input</dt>
                    <dd className="break-all text-fg">{example.input}</dd>
                    <dt className="text-fg-subtle">Output</dt>
                    <dd className="break-all text-axon-soft">{example.output}</dd>
                  </dl>
                  {example.explanation ? (
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                      <InlineMarkdown text={example.explanation} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {problem.constraints.length > 0 ? (
          <div>
            <SectionTitle>Constraints</SectionTitle>
            <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
              {problem.constraints.map((constraint) => (
                <li key={constraint} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-synapse" />
                  <span className="font-mono text-[0.8125rem] leading-6">
                    <InlineMarkdown text={constraint} options={{ superscript: true, typography: true }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 border-t border-line bg-ink-900/50 p-5 sm:p-6">
        <div className="flex gap-3">
          <span aria-hidden="true" className="text-lg leading-6">
            📲
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-medium text-fg">Struggle sync</p>
            <p className="mt-0.5 text-fg-muted">
              Fail a stage, lean on hints, or give up, and Synapse flags{" "}
              {problem.weakTags.map((ref, index) => (
                <span key={ref.tag}>
                  <span className={cn("font-medium", weak.has(ref.tag) ? "text-warning" : "text-fg")}>{ref.label}</span>
                  {index < problem.weakTags.length - 2 ? ", " : index === problem.weakTags.length - 2 ? " and " : ""}
                </span>
              ))}{" "}
              then texts you a matching drill the next morning.
              {weakAlready.length > 0 ? " Already a weak spot for you." : ""}
            </p>
            {problem.relatedCards.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Drills for this problem">
                {problem.relatedCards.slice(0, 4).map((card) => (
                  <li key={card.id} className="rounded-full border border-line-strong bg-ink-800 px-2.5 py-0.5 text-xs text-fg-muted">
                    {card.title}
                  </li>
                ))}
              </ul>
            ) : null}
            {problem.weakTags[0] ? (
              <ButtonLink href={`/review?tag=${problem.weakTags[0].tag}`} variant="ghost" size="sm" className="-ml-3 mt-2">
                Drill {problem.weakTags[0].label} now
                <span aria-hidden="true">→</span>
              </ButtonLink>
            ) : null}
          </div>
        </div>

        {attempts && attempts.length > 0 && now !== null ? (
          <div>
            <SectionTitle>Your history</SectionTitle>
            <ul className="mt-2 space-y-1.5 text-sm">
              {attempts.slice(0, 5).map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true">{attempt.gaveUp ? "🏳️" : attempt.passed ? "✅" : "🧩"}</span>
                    <span className="truncate text-fg-muted">
                      {STAGE_META[attempt.stage].title}
                      {attempt.stage === "code" && attempt.testsTotal ? ` · ${attempt.testsPassed ?? 0}/${attempt.testsTotal}` : ""}
                      {attempt.language ? ` · ${attempt.language === "python" ? "Py" : "JS"}` : ""}
                      <span className="sr-only">{attempt.gaveUp ? " (gave up)" : attempt.passed ? " (passed)" : " (not passed)"}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{formatRelative(attempt.createdAt, now)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
