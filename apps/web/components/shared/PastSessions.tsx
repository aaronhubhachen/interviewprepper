"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { fetchPracticeSessions } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { PracticeSessionSummary } from "@/lib/types";

/** Saved rounds of one kind (newest first); clicking one reopens its full report. Renders nothing when empty. */
export function PastSessions({
  kind,
  title = "Past rounds",
  describe,
  onOpen,
  className = "mt-5",
}: {
  kind: "grill" | "mock" | "design";
  title?: string;
  describe: (session: PracticeSessionSummary) => { title: ReactNode; meta?: ReactNode };
  onOpen: (session: PracticeSessionSummary) => void;
  className?: string;
}) {
  const [sessions, setSessions] = useState<PracticeSessionSummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPracticeSessions(kind, 10, { signal: controller.signal })
      .then((response) => setSessions(response.sessions))
      .catch(() => {
        if (!controller.signal.aborted) setSessions([]);
      });
    return () => controller.abort();
  }, [kind]);

  if (!sessions || sessions.length === 0) return null;
  const now = Date.now();

  return (
    <Card id="past" className={className}>
      <CardHeader title={title} level={2} />
      <ul className="divide-y divide-line">
        {sessions.map((session) => {
          const view = describe(session);
          return (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => onOpen(session)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-synapse"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{view.title}</span>
                  <span className="text-xs text-fg-subtle">
                    {formatRelative(session.createdAt, now)}
                    {view.meta ? <> · {view.meta}</> : null}
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
