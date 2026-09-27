import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { BotReport, ClientProblem } from "@/lib/types";

function band(score: number): string {
  if (score >= 85) return "You'd pass this round.";
  if (score >= 70) return "Solid, with habits to tighten.";
  if (score >= 50) return "Mixed: the AI did more of the thinking than you.";
  return "An interviewer would worry about how you use AI.";
}

export function BotReportView({
  problem,
  report,
  onRetry,
  onNew,
  embedded = false,
}: {
  problem: ClientProblem;
  report: BotReport;
  onRetry?: () => void;
  onNew?: () => void;
  /** Inline under the IDE: no page title, single column. */
  embedded?: boolean;
}) {
  const caught = report.traps.filter((trap) => trap.caught).length;
  return (
    <div className="space-y-5 motion-safe:animate-fade-up">
      {embedded ? null : (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">Prepr Bot · report</p>
          <h1 className="mt-1 text-3xl font-semibold text-fg">{problem.title}</h1>
        </div>
      )}

      <Card glow>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-6xl font-bold tracking-tight text-fg tabular-nums">{report.overall}</span>
            <span className="text-lg text-fg-subtle">/100</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-fg">{band(report.overall)}</p>
            <p className="mt-1 text-fg-muted">{report.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.traps.length > 0 ? (
                <Pill tone={caught === report.traps.length ? "success" : "warning"}>
                  Caught {caught} of {report.traps.length} AI {report.traps.length === 1 ? "mistake" : "mistakes"}
                </Pill>
              ) : (
                <Pill tone="neutral">No mistakes planted this round</Pill>
              )}
              {report.source === "heuristic" ? <Pill tone="neutral">Offline scoring</Pill> : null}
            </div>
          </div>
        </div>
      </Card>

      <div className={embedded ? "grid gap-5" : "grid gap-5 lg:grid-cols-2"}>
        <Card>
          <CardHeader title="How you used the AI" />
          <ul className="space-y-4">
            {report.dimensions.map((dimension) => (
              <li key={dimension.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-fg">{dimension.label}</span>
                  <span className="tabular-nums text-fg-muted">{dimension.score}</span>
                </div>
                <ProgressBar value={dimension.score} max={100} label={dimension.label} size="sm" className="mt-1.5" />
                {dimension.note ? <p className="mt-1 text-sm text-fg-muted">{dimension.note}</p> : null}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          {report.traps.length > 0 ? (
            <Card>
              <CardHeader title="The bugs Prepr Bot planted" />
              <ul className="space-y-3">
                {report.traps.map((trap, index) => (
                  <li key={index} className="rounded-xl border border-line bg-ink-900/60 p-3">
                    <Pill tone={trap.caught ? "success" : "danger"}>{trap.caught ? "Caught" : "Missed"}</Pill>
                    <p className="mt-2 text-sm font-medium text-fg">{trap.description}</p>
                    <p className="mt-1 text-sm text-fg-muted">{trap.evidence}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {report.highlights.length > 0 ? (
            <Card>
              <CardHeader title="Moments that mattered" level={3} />
              <ul className="space-y-2.5">
                {report.highlights.map((highlight, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span aria-hidden="true" className="font-mono font-bold text-synapse">
                      {highlight.kind === "good" ? "+" : "!"}
                    </span>
                    <span className="text-fg-muted">
                      <span className="sr-only">{highlight.kind === "good" ? "Good: " : "Risk: "}</span>
                      {highlight.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {report.followUps.length > 0 ? (
            <Card>
              <CardHeader title="Your interviewer would ask next" level={3} />
              <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-muted">
                {report.followUps.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      </div>

      {onNew || onRetry ? (
        <div className="flex flex-wrap justify-end gap-3">
          {onNew ? (
            <Button variant="secondary" onClick={onNew}>
              New round
            </Button>
          ) : null}
          {onRetry ? (
            <Button onClick={onRetry} rightIcon={<span aria-hidden="true">↻</span>}>
              Retry this problem
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
