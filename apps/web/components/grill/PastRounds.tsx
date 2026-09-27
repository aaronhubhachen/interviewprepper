"use client";

import type { GrillReport } from "@synapse/core";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { fetchPracticeSessions } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { PracticeSessionSummary } from "@/lib/types";

/** Saved grill reports (newest first); opening one shows its full report. */
export function PastRounds({ onOpen }: { onOpen: (report: GrillReport) => void }) {
  const [sessions, setSessions] = useState<PracticeSessionSummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPracticeSessions("grill", 10, { signal: controller.signal })
      .then((response) => setSessions(response.sessions))
      .catch(() => {
        if (!controller.signal.aborted) setSessions([]);
      });
    return () => controller.abort();
  }, []);

  if (!sessions || sessions.length === 0) return null;
  const now = Date.now();

  return (
    <Card className="mt-5">
      <CardHeader title="Past rounds" description="Every grill you finished, newest first. Open one to reread the verdicts." level={2} />
      <ul className="divide-y divide-line">
        {sessions.map((session) => {
          const report = session.report as GrillReport;
          const cracked = report.claims?.filter((claim) => claim.verdict === "cracked").length ?? 0;
          return (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => onOpen(report)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-synapse"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{report.summary ?? "Resume grill"}</span>
                  <span className="text-xs text-fg-subtle">
                    {formatRelative(session.createdAt, now)} · {report.claims?.length ?? 0} claims · {cracked} cracked
                  </span>
                </span>
                <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-fg">{session.score}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
