"use client";

import type { GrillReport } from "@synapse/core";
import { PastSessions } from "@/components/shared/PastSessions";

/** Saved grill reports (newest first); opening one shows its full report. */
export function PastRounds({ onOpen }: { onOpen: (report: GrillReport) => void }) {
  return (
    <PastSessions
      kind="grill"
      describe={(session) => {
        const report = session.report as GrillReport;
        const cracked = report.claims?.filter((claim) => claim.verdict === "cracked").length ?? 0;
        return { title: report.summary ?? "Resume grill", meta: `${report.claims?.length ?? 0} claims · ${cracked} cracked` };
      }}
      onOpen={(session) => onOpen(session.report as GrillReport)}
    />
  );
}
