import { Button, Card, CardHeader, Pill, type PillTone } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { GrillReport, GrillTurn } from "@/lib/types";

type Verdict = GrillReport["claims"][number]["verdict"];

const VERDICTS: Record<Verdict, { label: string; tone: PillTone }> = {
  held: { label: "Held up", tone: "success" },
  shaky: { label: "Shaky", tone: "warning" },
  cracked: { label: "Cracked", tone: "danger" },
};

function band(score: number): string {
  if (score >= 80) return "Your resume survived.";
  if (score >= 60) return "Mostly held, with soft spots.";
  if (score >= 40) return "Several claims buckled.";
  return "The resume didn't survive.";
}

export interface GrillReportViewProps {
  report: GrillReport;
  turns: GrillTurn[];
  onAgain: () => void;
  onNewResume: () => void;
}

export function GrillReportView({ report, turns, onAgain, onNewResume }: GrillReportViewProps) {
  const counts = report.claims.reduce<Record<Verdict, number>>(
    (acc, claim) => ({ ...acc, [claim.verdict]: acc[claim.verdict] + 1 }),
    { held: 0, shaky: 0, cracked: 0 },
  );

  return (
    <div className="grid gap-5 motion-safe:animate-fade-up">
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
              {(Object.keys(VERDICTS) as Verdict[]).map((verdict) => (
                <Pill key={verdict} tone={VERDICTS[verdict].tone}>
                  {counts[verdict]} {VERDICTS[verdict].label.toLowerCase()}
                </Pill>
              ))}
              {turns.length > 0 ? <Pill tone="neutral">{turns.length} questions</Pill> : null}
              {report.source === "heuristic" ? <Pill tone="neutral" title="No LLM configured or it timed out">Offline scoring</Pill> : null}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Claim by claim" />
        <ul className="divide-y divide-line">
          {report.claims.map((claim, index) => (
            <li key={index} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
              <Pill tone={VERDICTS[claim.verdict].tone} className="w-fit shrink-0">
                {VERDICTS[claim.verdict].label}
              </Pill>
              <div className="min-w-0">
                <p className="font-medium text-fg">{claim.claim}</p>
                {claim.note ? <p className="mt-0.5 text-sm text-fg-muted">{claim.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className={cn("grid gap-5", report.redFlags.length > 0 && "md:grid-cols-2")}>
        {report.redFlags.length > 0 ? (
          <Card>
            <CardHeader title="Red flags" level={3} />
            <List items={report.redFlags} marker="!" />
          </Card>
        ) : null}
        <Card>
          <CardHeader title="Fix before the real one" level={3} />
          <List items={report.fixes} marker="→" />
        </Card>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onNewResume}>
          Use a different resume
        </Button>
        <Button onClick={onAgain} rightIcon={<span aria-hidden="true">↻</span>}>
          Grill me again
        </Button>
      </div>
    </div>
  );
}

function List({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-fg-muted">
          <span aria-hidden="true" className="mt-0.5 font-mono text-sm font-bold text-synapse">
            {marker}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
